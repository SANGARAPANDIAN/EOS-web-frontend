"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils/cn";
import { PLACEMENT_NAV, type PlacementNavItem } from "../nav";
import { useCompanies } from "../hooks/useCompanies";
import { useDrives } from "../hooks/useDrives";
import { useEligibleStudents } from "../hooks/useEligibleStudents";

interface PlacementSidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export function PlacementSidebar({ collapsed, onToggleCollapsed }: PlacementSidebarProps) {
  const pathname = usePathname();
  const students = useEligibleStudents();
  const companies = useCompanies({ page_size: 1 });
  const drives = useDrives();

  const badgeValues: Partial<Record<NonNullable<PlacementNavItem["badgeKey"]>, number>> = {
    students: students.data?.length,
    companies: companies.data?.total,
    drives: drives.data?.length,
  };

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col overflow-y-auto border-r border-border-default bg-surface text-body transition-[width] duration-150",
        collapsed ? "w-[76px]" : "w-[246px]",
      )}
    >
      <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-3 py-3.5">
        {PLACEMENT_NAV.map((group, groupIndex) => (
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
              const active = item.href === "/placement" ? pathname === "/placement" : pathname.startsWith(item.href);
              const badge = item.badgeKey ? badgeValues[item.badgeKey] : undefined;

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
                  {!collapsed && (
                    <>
                      <span className="flex-1">{item.label}</span>
                      {badge != null && (
                        <span
                          className={cn(
                            "rounded-pill px-2 py-0.5 font-mono text-[10.5px]",
                            active ? "bg-accent-200 text-primary" : "bg-surface-tint text-subtle",
                          )}
                        >
                          {badge.toLocaleString("en-IN")}
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

      {!collapsed && (
        <div className="border-t border-border-default px-[18px] py-3.5">
          <div className="text-[11.5px] font-semibold text-ink">Placement Cell Helpdesk</div>
          <div className="mt-0.5 text-[11px] text-muted">Block B, Ground Floor · ext. 2043</div>
        </div>
      )}
    </aside>
  );
}
