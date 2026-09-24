"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { getModuleConfig } from "@/modules/registry";
import { MessagesShell } from "@/modules/messaging/MessagesShell";

/**
 * This route has no per-role allow-list (every role uses messaging) — but a
 * role whose ModuleConfig sets `excludeMessages` (e.g. canteen_admin) must
 * not reach it at all, not just lose the sidebar link. Without this, editing
 * the URL directly bypassed the exclusion entirely.
 */
export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  const { session, status } = useAuth();
  const router = useRouter();
  const role = session?.user.role;
  const ownModule = role ? getModuleConfig(role) : undefined;
  const blocked = !!ownModule?.excludeMessages;

  useEffect(() => {
    if (status !== "authenticated" || !blocked || !ownModule) return;
    router.replace(ownModule.homeHref ?? `${ownModule.basePath}/dashboard`);
  }, [status, blocked, ownModule, router]);

  if (status !== "authenticated" || blocked) {
    return <div className="flex h-screen items-center justify-center bg-surface text-sm text-muted">Loading…</div>;
  }

  return <MessagesShell>{children}</MessagesShell>;
}
