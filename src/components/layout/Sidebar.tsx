"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { SidebarBrandHeader } from "@/components/layout/SidebarBrandHeader";
import { SidebarUserFooter } from "@/components/layout/SidebarUserFooter";
import { cn } from "@/lib/utils/cn";
import type { ModuleConfig, NavBadgeKey } from "@/modules/types";

interface SidebarProps {
  moduleConfig: ModuleConfig;
  studentName?: string;
  registerNumber?: string;
  navBadges?: Partial<Record<NavBadgeKey, ReactNode>>;
  /** Opt-in: makes the footer's avatar/name area clickable — see `SidebarUserFooter`. */
  onIdentityClick?: () => void;
}

export function Sidebar({ moduleConfig, studentName, registerNumber, navBadges, onIdentityClick }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col overflow-hidden border-r border-border-default bg-surface transition-[width] duration-150",
        collapsed ? "w-[76px]" : "w-[264px]",
      )}
    >
      <SidebarBrandHeader collapsed={collapsed} />

      <nav className="flex flex-1 flex-col gap-3.5 overflow-y-auto px-3 pt-3.5 pb-2">
        {moduleConfig.navGroups.map((group, groupIndex) => (
          <div key={group.label} className="flex flex-col gap-0.5">
            <div
              className={cn(
                "flex items-center pt-1 pr-2.5 pb-1.5 pl-2.5",
                collapsed ? "justify-center" : "justify-between",
              )}
            >
              {!collapsed && (
                <span className="text-[10px] font-extrabold tracking-[.11em] text-subtle">
                  {group.label.toUpperCase()}
                </span>
              )}
              {groupIndex === 0 && (
                <button
                  type="button"
                  onClick={() => setCollapsed((v) => !v)}
                  aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
                  title={collapsed ? "Expand navigation" : "Collapse navigation"}
                  className="flex size-[22px] shrink-0 items-center justify-center rounded-input text-subtle hover:bg-surface-tint hover:text-body"
                >
                  <Icon name={collapsed ? "keyboard_double_arrow_right" : "keyboard_double_arrow_left"} size={15} />
                </button>
              )}
            </div>
            {group.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              const badge = item.badgeKey ? navBadges?.[item.badgeKey] : undefined;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "flex w-full items-center gap-[11px] rounded-[9px] px-[11px] py-2.5 text-[13.5px] transition-colors",
                    collapsed && "justify-center",
                    active
                      ? "bg-accent-100 font-bold text-primary"
                      : "font-bold text-body hover:bg-nav-hover hover:text-ink",
                  )}
                >
                  {item.icon && (
                    <Icon name={item.icon} size={19} className="w-5 shrink-0 text-center" />
                  )}
                  {!collapsed && (
                    <>
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
                    </>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <SidebarUserFooter
        displayName={studentName}
        subLabel={registerNumber ?? moduleConfig.moduleLabel}
        portalName={moduleConfig.moduleLabel}
        collapsed={collapsed}
        onIdentityClick={onIdentityClick}
      />
    </aside>
  );
}
