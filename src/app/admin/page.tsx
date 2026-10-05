"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Admin from "@/components/pages/Admin";

export default function AdminPage() {
  const { user, authReady } = useAuth();
  const router = useRouter();
  const canWrite = user?.role === "analyst" || user?.role === "admin";

  useEffect(() => {
    // See dashboard/page.tsx's comment — same authReady race on hard reload.
    // A customer who lands here (no role) is bounced to the dashboard, not
    // /login — the server-side role check on every /admin/insights/* call
    // is the real gate; this is just UX, never trust it as the boundary.
    if (authReady && !user) router.replace("/login");
    else if (authReady && user && !canWrite) router.replace("/dashboard");
  }, [user, authReady, canWrite, router]);

  if (!canWrite) return null;
  return <Admin />;
}
