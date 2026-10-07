"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import type { AppView, NavigateFn, User } from "@/lib/types";
import { clearSession, loadSession, saveSession, tokenExpiresAt } from "@/lib/session";
import { refreshWithPasskey } from "@/lib/webauthn";
import { ApiError } from "@/lib/api";

// Normalizes a name once at the point it enters app state (however the user
// typed it at signup) so every screen that renders user.name shows it the
// same way, e.g. "amol shinde" / "AMOL SHINDE" -> "Amol Shinde".
function toTitleCase(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

interface AuthContextValue {
  user: User | null;
  authReady: boolean;
  showUpgradeModal: boolean;
  setShowUpgradeModal: (open: boolean) => void;
  showProCelebration: boolean;
  dismissProCelebration: () => void;
  navigate: NavigateFn;
  /**
   * Runs an authenticated API call with the current access token; on a 401
   * (token expired mid-session — see TECH_DEBT.md TD-047), tries one
   * biometric/PIN refresh and retries once, and only logs the user out if
   * that refresh also fails. Use this for any Bearer-protected fetch
   * instead of calling user.token directly.
   */
  withAuth: <T>(fn: (token: string) => Promise<T>) => Promise<T>;
  login: (
    phone: string,
    opts?: { token?: string; subscription?: "free" | "pro"; name?: string; userId?: string; role?: string },
  ) => void;
  logout: () => void;
  upgradeToPro: () => void;
  onUpgrade: () => void;
  currentView: AppView;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function pathToView(pathname: string): AppView {
  if (pathname === "/") return "landing";
  if (pathname.startsWith("/login")) return "login";
  if (pathname.startsWith("/dashboard")) return "dashboard";
  if (pathname.startsWith("/trading")) return "trading";
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/courses/")) return "course-detail";
  if (pathname.startsWith("/courses")) return "courses";
  if (pathname.startsWith("/videos")) return "videos";
  return "landing";
}

function viewToPath(view: AppView, courseId?: number): string {
  switch (view) {
    case "landing":
      return "/";
    case "login":
      return "/login";
    case "dashboard":
      return "/dashboard";
    case "trading":
      return "/trading";
    case "admin":
      return "/admin";
    case "courses":
      return "/courses";
    case "course-detail":
      return `/courses/${courseId ?? 2}`;
    case "videos":
      return "/videos";
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showProCelebration, setShowProCelebration] = useState(false);

  useEffect(() => {
    const stored = loadSession();
    setUser(stored);
    setAuthReady(true);

    // Only bother refreshing if the stored token is actually at/near
    // expiry (60s buffer) — reading `exp` straight off the token itself,
    // not a hardcoded guess at the backend's TTL. Without this check, a
    // perfectly valid token still in its first 30 minutes would trigger a
    // biometric/PIN prompt on every single reload, which is exactly the
    // "why is it asking Touch ID every refresh" bug this fixes.
    const expiry = stored?.token ? tokenExpiresAt(stored.token) : null;
    const tokenStale = !expiry || Date.now() > expiry - 60_000;
    if (stored?.userId && tokenStale) {
      refreshWithPasskey(stored.userId).then((result) => {
        if (!result) return;
        setUser((prev) => {
          if (!prev) return prev;
          const next: User = {
            ...prev,
            token: result.token,
            subscription: result.subscription === "pro" ? "pro" : "free",
            role: result.role ?? prev.role,
          };
          saveSession(next);
          return next;
        });
      });
    }
  }, []);

  const currentView = pathToView(pathname);

  const navigate = useCallback<NavigateFn>(
    (view, courseId) => {
      const needsLogin =
        view === "trading" ||
        view === "dashboard" ||
        view === "admin" ||
        view === "courses" ||
        view === "course-detail";
      const target = !user && needsLogin ? "login" : view;
      router.push(viewToPath(target, courseId));
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [router, user],
  );

  const login = useCallback(
    (
      phone: string,
      opts?: {
        token?: string;
        subscription?: "free" | "pro";
        name?: string;
        userId?: string;
        role?: string;
      },
    ) => {
      const subscription = opts?.subscription === "pro" ? "pro" : "free";
      const next: User = {
        phone,
        name: opts?.name?.trim() ? toTitleCase(opts.name) : "Investor",
        subscription,
        token: opts?.token,
        userId: opts?.userId,
        role: opts?.role,
      };
      setUser(next);
      saveSession(next);
      // RA/admin accounts land on /admin, not the customer dashboard — same
      // role check as app/admin/page.tsx's own write-access guard, so this
      // never drifts from what actually grants access.
      const isRAOrAdmin = next.role === "analyst" || next.role === "admin";
      router.push(isRAOrAdmin ? "/admin" : "/dashboard");
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [router],
  );

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
    router.push("/");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [router]);

  const withAuth = useCallback(
    async <T,>(fn: (token: string) => Promise<T>): Promise<T> => {
      if (!user?.token) throw new Error("not logged in");
      try {
        return await fn(user.token);
      } catch (err) {
        if (!(err instanceof ApiError) || err.status !== 401 || !user.userId) throw err;

        const result = await refreshWithPasskey(user.userId);
        if (!result) {
          // Can't silently recover — no credential, or the 7-day OTP
          // window has lapsed (see TECH_DEBT.md TD-047). Force a clean
          // re-login rather than leaving the user stuck on a dead token.
          logout();
          throw err;
        }
        setUser((prev) => {
          if (!prev) return prev;
          const next: User = {
            ...prev,
            token: result.token,
            subscription: result.subscription === "pro" ? "pro" : "free",
            role: result.role ?? prev.role,
          };
          saveSession(next);
          return next;
        });
        return fn(result.token);
      }
    },
    [user, logout],
  );

  const upgradeToPro = useCallback(() => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, subscription: "pro" as const };
      saveSession(next);
      return next;
    });
    setShowUpgradeModal(false);
    setShowProCelebration(true);
  }, []);

  const dismissProCelebration = useCallback(() => setShowProCelebration(false), []);

  const onUpgrade = useCallback(() => setShowUpgradeModal(true), []);

  const value = useMemo(
    () => ({
      user,
      authReady,
      showUpgradeModal,
      setShowUpgradeModal,
      showProCelebration,
      dismissProCelebration,
      navigate,
      withAuth,
      login,
      logout,
      upgradeToPro,
      onUpgrade,
      currentView,
    }),
    [
      user,
      withAuth,
      authReady,
      showUpgradeModal,
      showProCelebration,
      dismissProCelebration,
      navigate,
      login,
      logout,
      upgradeToPro,
      onUpgrade,
      currentView,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
