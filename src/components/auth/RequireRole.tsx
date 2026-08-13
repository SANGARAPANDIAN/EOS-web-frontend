"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { getModuleConfig } from "@/modules/registry";

/**
 * Per-module role gate, layered inside RequireAuth (which only checks
 * "is anyone logged in"). Without this, any authenticated role could reach
 * any module's routes just by editing the URL — e.g. a faculty session
 * opening /edc/dashboard directly, which is exactly the gap this closes.
 * On a mismatch, sends the user to THEIR own module's dashboard (not
 * /login) since they are legitimately authenticated, just in the wrong
 * portal.
 */
export function RequireRole({ allow, children }: { allow: string[]; children: React.ReactNode }) {
  const { session, status } = useAuth();
  const router = useRouter();
  const role = session?.user.role;
  const allowed = !!role && allow.includes(role);

  useEffect(() => {
    if (status !== "authenticated") return;
    if (allowed) return;
    const ownModule = getModuleConfig(role);
    router.replace(ownModule ? `${ownModule.basePath}/dashboard` : "/login");
  }, [status, allowed, role, router]);

  if (status !== "authenticated" || !allowed) {
    return <div className="flex h-screen items-center justify-center bg-surface text-sm text-muted">Loading…</div>;
  }

  return <>{children}</>;
}
