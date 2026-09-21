import Link from "next/link";
import type { ReactNode } from "react";

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh" style={{ background: "var(--background)" }}>
      <header
        className="border-b px-5 py-4"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <Link
            href="/"
            className="text-sm font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            ShubhShreekh
          </Link>
          <nav className="flex flex-wrap gap-3 text-xs sm:text-sm">
            <Link href="/legal/privacy" style={{ color: "var(--primary)" }}>
              Privacy
            </Link>
            <Link href="/legal/terms" style={{ color: "var(--primary)" }}>
              Terms
            </Link>
            <Link href="/legal/grievance" style={{ color: "var(--primary)" }}>
              Grievance
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-10">{children}</main>
    </div>
  );
}
