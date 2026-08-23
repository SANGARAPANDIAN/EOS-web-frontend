"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { IconButton } from "@/components/ui/IconButton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/utils/cn";
import { useAuth } from "@/lib/auth/AuthContext";
import { useMyRoles } from "@/lib/auth/roles";
import { getModuleConfig } from "@/modules/registry";
import { ROLE_LABEL } from "@/lib/config";
import { COORDINATOR_NAV } from "../nav";

interface AcademicCoordinatorSidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

/** Bottom-of-sidebar identity + role-switch + sign-out — matches the Principal module's reference pattern exactly, kept uniform across every role's sidebar. */
function UserFooter({ collapsed }: { collapsed: boolean }) {
  const router = useRouter();
  const { session, logout, switchRole } = useAuth();
  const userEmail = session?.user.email;
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
        <Avatar name={userEmail || "Academic Coordinator"} />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 border-t border-border-default px-3 py-3">
      <Avatar name={userEmail || "Academic Coordinator"} />
      <div className="min-w-0 flex-1 leading-[1.25]">
        <div className="truncate text-sm font-semibold text-ink">{userEmail ?? "Academic Coordinator"}</div>
        <div className="text-xs text-muted">Academic Coordinator</div>
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
        description="You'll need to log in again to access the Academic Coordinator portal."
        confirmLabel="Sign out"
        destructive
        onConfirm={logout}
        onCancel={() => setConfirmingLogout(false)}
      />
    </div>
  );
}

export function AcademicCoordinatorSidebar({ collapsed, onToggleCollapsed }: AcademicCoordinatorSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col overflow-y-auto border-r border-border-default bg-surface text-body transition-[width] duration-150",
        collapsed ? "w-[76px]" : "w-[246px]",
      )}
    >
      <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-3 py-3.5">
        {COORDINATOR_NAV.map((group, groupIndex) => (
          <div key={group.label} className="flex flex-col gap-px">
            {(!collapsed || groupIndex === 0) && (
              <div className={cn("flex items-center pt-1 pr-2.5 pb-1.5 pl-2.5", collapsed ? "justify-center" : "justify-between")}>
                {!collapsed && <span className="text-[9.5px] font-bold tracking-[1.1px] text-subtle">{group.label}</span>}
                {groupIndex === 0 && (
                  <button
                    type="button"
                    onClick={onToggleCollapsed}
                    aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
                    title={collapsed ? "Expand navigation" : "Collapse navigation"}
                    className="flex size-[22px] shrink-0 items-center justify-center rounded-input text-subtle hover:bg-surface-tint hover:text-body"
                  >
                    <Icon name={collapsed ? "keyboard_double_arrow_right" : "keyboard_double_arrow_left"} size={15} />
                  </button>
                )}
              </div>
            )}
            {group.items.map((item) => {
              const active = pathname.startsWith(item.href);

              if (item.soon) {
                return (
                  <button
                    key={item.href}
                    type="button"
                    disabled
                    title={`${item.label} — coming next`}
                    className={cn(
                      "flex cursor-not-allowed items-center gap-3 rounded-input px-[11px] py-2.5 text-sm font-medium text-subtle",
                      collapsed && "justify-center",
                    )}
                  >
                    <Icon name={item.icon} size={19} className="shrink-0 opacity-70" />
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left">{item.label}</span>
                        <span className="rounded-pill bg-surface-tint px-[7px] py-0.5 text-[9.5px] font-semibold text-subtle">Soon</span>
                      </>
                    )}
                  </button>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-input px-[11px] py-2.5 text-sm",
                    collapsed && "justify-center",
                    active ? "bg-accent-100 font-semibold text-primary" : "font-medium text-body hover:bg-surface-tint",
                  )}
                >
                  <Icon name={item.icon} size={19} className="shrink-0 opacity-90" />
                  {!collapsed && <span className="flex-1">{item.label}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <UserFooter collapsed={collapsed} />
    </aside>
  );
}
