"use client";

import Image from "next/image";
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
import type { ModuleConfig, NavBadgeKey } from "@/modules/types";

interface SidebarProps {
  moduleConfig: ModuleConfig;
  studentName?: string;
  registerNumber?: string;
  navBadges?: Partial<Record<NavBadgeKey, ReactNode>>;
}

export function Sidebar({ moduleConfig, studentName, registerNumber, navBadges }: SidebarProps) {
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
      if (rolesRef.current && !rolesRef.current.contains(e.target as Node)) {
        setRolesOpen(false);
      }
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
    <aside className="flex w-[264px] shrink-0 flex-col overflow-hidden border-r border-border-default bg-surface">
      <div className="flex h-20 items-center gap-3 border-b border-[#eef1f7] px-5">
        <Image
          src="/college-logo.png"
          alt="College logo"
          width={40}
          height={40}
          priority
          className="shrink-0 object-contain"
        />
        <div className="leading-[1.15]">
          <div className="text-base font-extrabold tracking-[-.02em] text-ink">Sri Eshwar</div>
          <div className="text-[11px] font-semibold text-muted">College of Engineering</div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-3.5 overflow-y-auto px-3 pt-3.5 pb-2">
        {moduleConfig.navGroups.map((group) => (
          <div key={group.label} className="flex flex-col gap-0.5">
            <div className="px-2.5 pt-1 pb-1.5 text-[10px] font-extrabold tracking-[.11em] text-subtle">
              {group.label.toUpperCase()}
            </div>
            {group.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              const badge = item.badgeKey ? navBadges?.[item.badgeKey] : undefined;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={cn(
                    "flex w-full items-center gap-[11px] rounded-[9px] px-[11px] py-2.5 text-[13.5px] transition-colors",
                    active
                      ? "bg-accent-100 font-bold text-primary"
                      : "font-bold text-body hover:bg-nav-hover hover:text-ink",
                  )}
                >
                  {item.icon && (
                    <Icon name={item.icon} size={19} className="w-5 text-center" />
                  )}
                  <span className="flex-1 text-left">{item.label}</span>
                  {badge != null && badge !== "" && (
                    <span
                      className={cn(
                        "rounded-[6px] px-[7px] py-0.5 font-mono text-[10.5px] font-bold",
                        active ? "bg-accent-200 text-primary" : "bg-divider text-muted",
                      )}
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

      <div className="flex items-center gap-[11px] border-t border-[#eef1f7] px-4 py-3.5">
        <Avatar name={studentName || "?"} />
        <div className="min-w-0 flex-1 leading-[1.25]">
          <div className="truncate text-[13px] font-bold text-ink">{studentName ?? " "}</div>
          <div className="font-mono text-[11px] text-muted">{registerNumber ?? " "}</div>
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
        description="You'll need to log in again to access your account."
        confirmLabel="Sign out"
        cancelLabel="Cancel"
        destructive
        onConfirm={logout}
        onCancel={() => setConfirmingLogout(false)}
      />
    </aside>
  );
}
