"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { IconButton } from "@/components/ui/IconButton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/utils/cn";
import { useAuth } from "@/lib/auth/AuthContext";
import { useMyRoles } from "@/lib/auth/roles";
import { getModuleConfig } from "@/modules/registry";
import { ROLE_LABEL } from "@/lib/config";
import type { NavBadgeKey } from "@/modules/types";
import { principalModuleConfig } from "@/modules/principal/nav";
import { principalColors } from "@/modules/principal/theme";

interface PrincipalSidebarProps {
  displayName?: string;
  designation?: string;
  navBadges?: Partial<Record<NavBadgeKey, ReactNode>>;
}

export function PrincipalSidebar({ displayName, designation, navBadges }: PrincipalSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, logout, switchRole } = useAuth();
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

  return (
    <aside
      className="flex w-[248px] shrink-0 flex-col overflow-hidden border-r"
      style={{ background: principalColors.bg, borderColor: principalColors.border }}
    >
      <nav className="flex flex-1 flex-col gap-[18px] overflow-y-auto px-3 pt-4 pb-2">
        {principalModuleConfig.navGroups.map((group) => (
          <div key={group.label} className="flex flex-col gap-0.5">
            <div
              className="px-2.5 pb-2 text-[11px] font-bold tracking-[.09em]"
              style={{ color: principalColors.textFaint }}
            >
              {group.label.toUpperCase()}
            </div>
            {group.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              const badge = item.badgeKey ? navBadges?.[item.badgeKey] : undefined;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className="flex h-[42px] items-center gap-3 rounded-[10px] px-3 text-[15px] transition-colors"
                  style={{
                    fontFamily: "var(--font-public-sans)",
                    background: active ? principalColors.surfaceTint : "transparent",
                    color: active ? principalColors.primaryDark : principalColors.body,
                    fontWeight: active ? 700 : 500,
                  }}
                >
                  {item.icon && <Icon name={item.icon} size={20} className="opacity-80" />}
                  <span className="flex-1 text-left">{item.label}</span>
                  {badge != null && badge !== "" && (
                    <span
                      className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium")}
                      style={{
                        fontFamily: "var(--font-jetbrains-mono)",
                        background: principalColors.borderLight,
                        color: principalColors.textMuted,
                      }}
                    >
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="flex items-center gap-3 border-t px-3 py-3" style={{ borderColor: principalColors.border }}>
        <Avatar name={displayName || "Principal"} className="bg-[#12296B]" />
        <div className="min-w-0 flex-1 leading-[1.25]">
          <div className="truncate text-sm font-semibold" style={{ color: principalColors.heading }}>
            {displayName ?? "Principal"}
          </div>
          <div className="text-xs" style={{ color: principalColors.textFaint }}>
            {designation ?? "Principal"}
          </div>
        </div>
        {otherRoles.length > 0 && (
          <div ref={rolesRef} className="relative">
            <IconButton
              icon="swap_horiz"
              size={34}
              iconSize={17}
              title="Switch role"
              onClick={() => setRolesOpen((v) => !v)}
            />
            {rolesOpen && (
              <div className="absolute bottom-[calc(100%+6px)] right-0 z-30 min-w-[210px] overflow-hidden rounded-card border border-border-default bg-surface py-1.5 shadow-modal">
                <div className="px-4 pb-1 pt-1.5 text-[10.5px] font-extrabold tracking-[.09em] text-subtle">
                  SWITCH ROLE
                </div>
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
      </div>

      <ConfirmDialog
        open={confirmingLogout}
        title="Sign out?"
        description="You'll need to log in again to access the Principal portal."
        confirmLabel="Sign out"
        cancelLabel="Cancel"
        destructive
        onConfirm={logout}
        onCancel={() => setConfirmingLogout(false)}
      />
    </aside>
  );
}
