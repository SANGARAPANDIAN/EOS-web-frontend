"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { IconButton } from "@/components/ui/IconButton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/utils/cn";
import { useAuth } from "@/lib/auth/AuthContext";
import { useMyRoles } from "@/lib/auth/roles";
import { getModuleConfig } from "@/modules/registry";
import { ROLE_LABEL } from "@/lib/config";

interface SidebarUserFooterProps {
  /** Real display name when a module has one (e.g. from its own identity endpoint) — falls back to the session email. */
  displayName?: string;
  /** Second line under the name — role/department text, e.g. "Secretary", "EDC Coordinator". */
  subLabel: string;
  /** Named in the sign-out confirm dialog: "...access the {portalName} portal." */
  portalName: string;
  collapsed?: boolean;
}

/** The one identity + role-switch + sign-out block every module's sidebar uses — never hand-roll this block, import it. */
export function SidebarUserFooter({ displayName, subLabel, portalName, collapsed }: SidebarUserFooterProps) {
  const router = useRouter();
  const { session, logout, switchRole } = useAuth();
  const name = displayName || session?.user.email || "?";
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const [rolesOpen, setRolesOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const rolesRef = useRef<HTMLDivElement>(null);

  const roles = useMyRoles();
  const otherRoles = (roles.data ?? []).filter((r) => r.name !== session?.user.role);

  useEffect(() => {
    if (!rolesOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (rolesRef.current && !rolesRef.current.contains(e.target as Node)) setRolesOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [rolesOpen]);

  async function handleSwitchRole(roleId: number) {
    setSwitching(true);
    try {
      const newSession = await switchRole(roleId);
      setRolesOpen(false);
      const target = getModuleConfig(newSession.user.role);
      router.push(target ? `${target.basePath}/dashboard` : "/login");
    } finally {
      setSwitching(false);
    }
  }

  if (collapsed) {
    return (
      <div className="flex items-center justify-center border-t border-border-default p-3">
        <Avatar name={name} />
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-[11px] border-t border-border-default px-4 py-3.5")}>
      <Avatar name={name} />
      <div className="min-w-0 flex-1 leading-[1.25]">
        <div className="truncate text-[13px] font-bold text-ink">{name}</div>
        <div className="text-[11px] text-muted">{subLabel}</div>
      </div>
      {otherRoles.length > 0 && (
        <div ref={rolesRef} className="relative">
          <IconButton icon="swap_horiz" size={34} iconSize={17} title="Switch role" onClick={() => setRolesOpen((v) => !v)} />
          {rolesOpen && (
            <div className="absolute bottom-[calc(100%+6px)] right-0 z-30 min-w-[210px] overflow-hidden rounded-card border border-border-default bg-surface py-1.5 shadow-modal">
              <div className="px-4 pt-1.5 pb-1 text-[10.5px] font-extrabold tracking-[.09em] text-subtle">SWITCH ROLE</div>
              {otherRoles.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  disabled={switching}
                  onClick={() => handleSwitchRole(r.id)}
                  className="block w-full px-4 py-2.5 text-left text-[13px] font-semibold text-ink hover:bg-nav-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {ROLE_LABEL[r.name] ?? r.description ?? r.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <IconButton icon="logout" size={34} iconSize={17} title="Log out" onClick={() => setConfirmingLogout(true)} />

      <ConfirmDialog
        open={confirmingLogout}
        title="Sign out?"
        description={`You'll need to log in again to access the ${portalName} portal.`}
        confirmLabel="Sign out"
        cancelLabel="Cancel"
        destructive
        onConfirm={logout}
        onCancel={() => setConfirmingLogout(false)}
      />
    </div>
  );
}
