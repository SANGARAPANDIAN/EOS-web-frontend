"use client";

import { createElement, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { getModuleConfig } from "@/modules/registry";
import { getShellForRole } from "@/modules/shellRegistry";
import { AppShell } from "@/components/layout/AppShell";

/**
 * Same "22nd shell" pattern as MessagesShell — `/order-food` isn't nested
 * under any specific role's route folder (reachable from every eligible
 * portal via the shared "Order Food" nav item injected in AppShell), so it
 * renders through the viewer's own real shell component from shellRegistry,
 * not a second reconstruction of their nav. A role whose ModuleConfig sets
 * `excludeOrderFood` (Parent, Transport, the two canteen operational
 * logins) is redirected away rather than rendered here at all.
 */
export default function OrderFoodLayout({ children }: { children: React.ReactNode }) {
  const { session, status } = useAuth();
  const router = useRouter();
  const role = session?.user.role;
  const ownModule = role ? getModuleConfig(role) : undefined;
  const blocked = !!ownModule?.excludeOrderFood;

  useEffect(() => {
    if (status !== "authenticated" || !blocked || !ownModule) return;
    router.replace(ownModule.homeHref ?? `${ownModule.basePath}/dashboard`);
  }, [status, blocked, ownModule, router]);

  if (status !== "authenticated" || blocked || !ownModule) {
    return <div className="flex h-screen items-center justify-center bg-surface text-sm text-muted">Loading…</div>;
  }

  const RoleShell = getShellForRole(role);
  if (RoleShell) {
    return createElement(RoleShell, null, children);
  }

  // Roles with no dedicated shell component yet (parent is excluded above;
  // alumni/non_teaching_staff fall back to a minimal generic shell, same as
  // MessagesShell does).
  return <AppShell moduleConfig={ownModule}>{children}</AppShell>;
}
