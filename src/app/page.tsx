"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { getModuleConfig } from "@/modules/registry";

export default function RootPage() {
  const { status, session } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated" || !session) {
      router.replace("/login");
      return;
    }
    const moduleConfig = getModuleConfig(session.user.role);
    router.replace(moduleConfig ? `${moduleConfig.basePath}/dashboard` : "/login");
  }, [status, session, router]);

  return <div className="flex h-screen items-center justify-center bg-surface text-sm text-muted">Loading…</div>;
}
