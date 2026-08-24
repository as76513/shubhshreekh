"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import UpgradeModal from "@/components/UpgradeModal";

const CREAM_BASE_PATHS = [
  "/dashboard",
  "/trading",
  "/mf-alerts",
  "/courses",
  "/videos",
];

export default function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { showUpgradeModal } = useAuth();

  const hideNav = pathname === "/login" || pathname.startsWith("/login/");
  const hideFooter =
    hideNav ||
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    /^\/courses\/[^/]+/.test(pathname);

  const creamBase = CREAM_BASE_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  return (
    <div
      className="relative min-h-screen text-foreground"
      style={{ fontFamily: "var(--font-outfit), Outfit, sans-serif" }}
    >
      <div
        className={`site-bg${creamBase ? " site-bg--cream" : ""}`}
        aria-hidden="true"
      />
      <div className="relative z-10">
        {!hideNav && <Navbar />}
        <div className="fade-in">{children}</div>
        {!hideFooter && <Footer />}
        {showUpgradeModal && <UpgradeModal />}
      </div>
    </div>
  );
}
