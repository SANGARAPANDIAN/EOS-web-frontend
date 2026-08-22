"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils/cn";
import { useAuth } from "@/lib/auth/AuthContext";
import { useMyRoles } from "@/lib/auth/roles";
import { getModuleConfig } from "@/modules/registry";
import { ROLE_LABEL } from "@/lib/config";
import { PLACEMENT_NAV } from "@/modules/placement/nav";

interface PlacementSidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  badges?: Partial<Record<"students" | "companies" | "drives", ReactNode>>;
  userEmail?: string;
}

function NavContent({
  collapsed,
  onToggleCollapsed,
  onItemClick,
  badges,
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onItemClick?: () => void;
  badges?: Partial<Record<"students" | "companies" | "drives", ReactNode>>;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 pt-3.5 pb-2">
      {PLACEMENT_NAV.map((group, groupIndex) => (
        <div key={group.label} className="mb-4 flex flex-col gap-0.5">
          <div className={cn("flex items-center px-2.5 pt-1 pb-1.5", collapsed && "justify-center")}>
            {!collapsed && (
              <span className="text-[10px] font-extrabold tracking-[.11em] text-admin-muted">
                {group.label.toUpperCase()}
              </span>
            )}
            {groupIndex === 0 && (
              <button
                type="button"
                onClick={onToggleCollapsed}
                aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
                title={collapsed ? "Expand navigation" : "Collapse navigation"}
                className={cn(
                  "grid size-[22px] shrink-0 cursor-pointer place-items-center rounded-admin-xs text-admin-subtle hover:bg-admin-tint-strong",
                  !collapsed && "ml-auto",
                )}
              >
                <Icon name={collapsed ? "keyboard_double_arrow_right" : "keyboard_double_arrow_left"} size={16} />
              </button>
            )}
          </div>
          {group.items.map((item) => {
            const active =
              item.href === "/placement" ? pathname === "/placement" : pathname.startsWith(item.href + "/") || pathname === item.href;
            const badge = item.badgeKey ? badges?.[item.badgeKey] : undefined;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onItemClick}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-admin-md px-2.5 py-2.5 text-[14px] font-semibold transition-colors",
                  collapsed && "justify-center",
                  active ? "bg-admin-tint-strong text-admin-primary-deep" : "text-admin-body hover:bg-admin-tint",
                )}
              >
                <Icon name={item.icon} size={19} />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">{item.label}</span>
                    {badge != null && badge !== "" && (
                      <span className="rounded-admin-pill bg-admin-tint-deep px-[7px] py-0.5 font-mono text-[10.5px] font-bold text-admin-body">
                        {badge}
                      </span>
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function UserFooter({ collapsed, userEmail }: { collapsed: boolean; userEmail?: string }) {
  const router = useRouter();
  const { session, logout, switchRole } = useAuth();
  const initials = (userEmail || "?").trim().charAt(0).toUpperCase();
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
    <div className={cn("flex items-center gap-2.5 border-t border-admin-border p-3", collapsed && "justify-center")}>
      <div className="grid size-9 shrink-0 place-items-center rounded-admin-pill bg-admin-primary-deep font-sans text-sm font-bold text-white">
        {initials}
      </div>
      {!collapsed && (
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-bold text-admin-ink">{userEmail ?? " "}</div>
          <div className="text-[12px] text-admin-muted">Placement Cell</div>
        </div>
      )}
      {otherRoles.length > 0 && (
        <div ref={rolesRef} className="relative">
          <button
            type="button"
            onClick={() => setRolesOpen((v) => !v)}
            title="Switch role"
            aria-label="Switch role"
            className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-admin-sm text-admin-subtle hover:bg-admin-tint-strong hover:text-admin-body"
          >
            <Icon name="swap_horiz" size={17} />
          </button>
          {rolesOpen && (
            <div className="absolute bottom-[calc(100%+6px)] right-0 z-30 min-w-[200px] overflow-hidden rounded-card border border-admin-border bg-surface py-1.5 shadow-modal">
              <div className="px-4 pb-1 pt-1.5 text-[10.5px] font-extrabold tracking-[.09em] text-admin-subtle">SWITCH ROLE</div>
              {otherRoles.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  disabled={switching}
                  onClick={() => handleSwitchRole(r.id)}
                  className="block w-full px-4 py-2.5 text-left text-[13px] font-semibold text-admin-ink hover:bg-admin-tint disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {ROLE_LABEL[r.name] ?? r.description ?? r.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <button
        type="button"
        onClick={logout}
        title="Log out"
        aria-label="Log out"
        className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-admin-sm text-admin-subtle hover:bg-admin-tint-strong hover:text-admin-body"
      >
        <Icon name="logout" size={17} />
      </button>
    </div>
  );
}

export function PlacementSidebar({
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onCloseMobile,
  badges,
  userEmail,
}: PlacementSidebarProps) {
  return (
    <>
      <aside
        className={cn(
          "hidden h-full shrink-0 flex-col overflow-hidden border-r border-admin-border bg-admin-canvas transition-[width] duration-150 lg:flex",
          collapsed ? "w-[76px]" : "w-[264px]",
        )}
      >
        <div className={cn("flex items-center gap-3 border-b border-admin-border px-5 pt-5 pb-[18px]", collapsed && "justify-center px-0")}>
          <Image src="/college-logo.png" alt="College logo" width={36} height={36} priority className="shrink-0 object-contain" />
          {!collapsed && (
            <div className="leading-[1.15]">
              <div className="text-[15px] font-extrabold tracking-[-.02em] text-admin-ink">Sri Eshwar</div>
              <div className="text-[10.5px] font-semibold text-admin-muted">Placement Module</div>
            </div>
          )}
        </div>
        <NavContent collapsed={collapsed} onToggleCollapsed={onToggleCollapsed} badges={badges} />
        <UserFooter collapsed={collapsed} userEmail={userEmail} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div className="fixed inset-0 bg-[rgba(13,30,79,.28)]" onClick={onCloseMobile} aria-hidden="true" />
          <aside className="relative flex h-full w-[264px] flex-col overflow-hidden bg-admin-canvas shadow-admin-modal">
            <div className="flex items-center justify-between border-b border-admin-border px-5 py-4">
              <div className="text-[15px] font-extrabold tracking-[-.02em] text-admin-ink">Sri Eshwar</div>
              <button onClick={onCloseMobile} aria-label="Close menu" className="text-admin-muted hover:text-admin-ink">
                <Icon name="close" size={20} />
              </button>
            </div>
            <NavContent collapsed={false} onToggleCollapsed={onToggleCollapsed} onItemClick={onCloseMobile} badges={badges} />
            <UserFooter collapsed={false} userEmail={userEmail} />
          </aside>
        </div>
      )}
    </>
  );
}
