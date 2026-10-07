"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Blogs from "@/components/pages/Blogs";

export default function BlogsPage() {
  const { user, authReady } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authReady && !user) router.replace("/login");
  }, [user, authReady, router]);

  if (!user) return null;
  return <Blogs />;
}
