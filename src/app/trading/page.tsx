"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import TradingCalls from "@/components/pages/TradingCalls";

export default function TradingPage() {
  const { user, authReady } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // See dashboard/page.tsx's comment — same authReady race on hard reload.
    if (authReady && !user) router.replace("/login");
  }, [user, authReady, router]);

  if (!user) return null;
  return <TradingCalls />;
}
