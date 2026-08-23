"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import type { AppView, NavigateFn, User } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  showUpgradeModal: boolean;
  setShowUpgradeModal: (open: boolean) => void;
  navigate: NavigateFn;
  login: (phone: string) => void;
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
  if (pathname.startsWith("/mf-alerts")) return "mf-alerts";
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
    case "mf-alerts":
      return "/mf-alerts";
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
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const currentView = pathToView(pathname);

  const navigate = useCallback<NavigateFn>(
    (view, courseId) => {
      const needsLogin =
        view === "trading" ||
        view === "mf-alerts" ||
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
    (phone: string) => {
      setUser({ phone, name: "Investor", subscription: "free" });
      router.push("/dashboard");
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [router],
  );

  const logout = useCallback(() => {
    setUser(null);
    router.push("/");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [router]);

  const upgradeToPro = useCallback(() => {
    setUser((prev) => (prev ? { ...prev, subscription: "pro" } : prev));
    setShowUpgradeModal(false);
  }, []);

  const onUpgrade = useCallback(() => setShowUpgradeModal(true), []);

  const value = useMemo(
    () => ({
      user,
      showUpgradeModal,
      setShowUpgradeModal,
      navigate,
      login,
      logout,
      upgradeToPro,
      onUpgrade,
      currentView,
    }),
    [
      user,
      showUpgradeModal,
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
