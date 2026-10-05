"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Dashboard from "@/components/pages/Dashboard";

export default function DashboardPage() {
  const { user, authReady } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait for authReady: on a hard reload/app relaunch, this effect can
    // run before AuthProvider's own mount effect restores `user` from
    // storage, which would otherwise bounce a logged-in user to /login
    // every single time they reopen the app.
    if (authReady && !user) router.replace("/login");
  }, [user, authReady, router]);

  if (!user) return null;
  return <Dashboard />;
}
