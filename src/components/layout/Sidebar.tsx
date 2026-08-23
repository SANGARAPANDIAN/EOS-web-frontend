"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
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
}

export function Sidebar({ moduleConfig, studentName, registerNumber, navBadges }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex w-[264px] shrink-0 flex-col overflow-hidden border-r border-border-default bg-surface">
      <SidebarBrandHeader />

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

      <SidebarUserFooter displayName={studentName} subLabel={registerNumber ?? moduleConfig.moduleLabel} portalName={moduleConfig.moduleLabel} />
    </aside>
  );
}
