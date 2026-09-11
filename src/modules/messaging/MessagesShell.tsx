"use client";

import { createElement } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/lib/auth/AuthContext";
import { getModuleConfig } from "@/modules/registry";
import { getShellForRole } from "@/modules/shellRegistry";

/**
 * The "22nd shell" — role-agnostic. `/messages` isn't nested under any
 * specific role's route folder (it's reachable from every portal via the
 * shared "Messages" nav item injected in AppShell), so it needs its own
 * thin wrapper — but that wrapper must render through the *viewer's own
 * real* shell component (shellRegistry), the exact same one every other
 * page in their portal already uses, not a second, parallel reconstruction
 * of their nav. Some shells (e.g. AdvisorShell) build their sidebar from
 * live data, not a static config — there is no way to correctly reproduce
 * that generically, only to reuse the real component.
 */
export function MessagesShell({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const role = session?.user.role;
  const RoleShell = getShellForRole(role);

  // createElement, not JSX, because RoleShell is picked dynamically from a
  // registry rather than being a literal, statically-known component name —
  // the react-hooks/static-components rule (rightly) flags `<RoleShell>`
  // JSX for that, since JSX assumes the tag is stable across renders.
  if (RoleShell) {
    return createElement(RoleShell, null, children);
  }

  // Roles with real backend support but no dedicated portal/shell built yet
  // (parent, alumni, non_teaching_staff — see registry.ts) fall back to a
  // minimal generic shell so messaging, their one real feature, still works.
  const moduleConfig = getModuleConfig(role);
  if (!moduleConfig) return null;

  return (
    <AppShell moduleConfig={moduleConfig} header={{ showNotifications: true }}>
      {children}
    </AppShell>
  );
}
