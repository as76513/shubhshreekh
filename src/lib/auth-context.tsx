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
import { clearSession, loadSession, saveSession } from "@/lib/session";

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
  login: (
    phone: string,
    opts?: { token?: string; subscription?: "free" | "pro"; name?: string },
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
    setUser(loadSession());
    setAuthReady(true);
  }, []);

  const currentView = pathToView(pathname);

  const navigate = useCallback<NavigateFn>(
    (view, courseId) => {
      const needsLogin =
        view === "trading" ||
        view === "dashboard" ||
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
      opts?: { token?: string; subscription?: "free" | "pro"; name?: string },
    ) => {
      const subscription = opts?.subscription === "pro" ? "pro" : "free";
      const next: User = {
        phone,
        name: opts?.name?.trim() ? toTitleCase(opts.name) : "Investor",
        subscription,
        token: opts?.token,
      };
      setUser(next);
      saveSession(next);
      router.push("/dashboard");
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
      login,
      logout,
      upgradeToPro,
      onUpgrade,
      currentView,
    }),
    [
      user,
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
