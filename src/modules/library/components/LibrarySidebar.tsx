"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils/cn";
import { BrandMark } from "@/components/layout/SidebarBrandHeader";
import { SidebarUserFooter } from "@/components/layout/SidebarUserFooter";
import { LIBRARY_NAV } from "@/modules/library/nav";

interface LibrarySidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  badges?: Partial<Record<"totalBooks", ReactNode>>;
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
  badges?: Partial<Record<"totalBooks", ReactNode>>;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 pt-3.5 pb-2">
      {LIBRARY_NAV.map((group, groupIndex) => (
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
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
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

export function LibrarySidebar({ collapsed, onToggleCollapsed, mobileOpen, onCloseMobile, badges }: LibrarySidebarProps) {
  return (
    <>
      <aside
        className={cn(
          "hidden h-full shrink-0 flex-col overflow-hidden border-r border-admin-border bg-admin-canvas transition-[width] duration-150 lg:flex",
          collapsed ? "w-[76px]" : "w-[264px]",
        )}
      >
        <div className={cn("border-b border-admin-border px-5 pt-5 pb-[18px]", collapsed && "flex justify-center px-0")}>
          <BrandMark subtitle="Library Module" collapsed={collapsed} />
        </div>
        <NavContent collapsed={collapsed} onToggleCollapsed={onToggleCollapsed} badges={badges} />
        <SidebarUserFooter subLabel="Library" portalName="Library" collapsed={collapsed} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div className="fixed inset-0 bg-[rgba(13,30,79,.28)]" onClick={onCloseMobile} aria-hidden="true" />
          <aside className="relative flex h-full w-[264px] flex-col overflow-hidden bg-admin-canvas shadow-admin-modal">
            <div className="flex items-center justify-between border-b border-admin-border px-5 py-4">
              <BrandMark subtitle="Library Module" />
              <button onClick={onCloseMobile} aria-label="Close menu" className="text-admin-muted hover:text-admin-ink">
                <Icon name="close" size={20} />
              </button>
            </div>
            <NavContent collapsed={false} onToggleCollapsed={onToggleCollapsed} onItemClick={onCloseMobile} badges={badges} />
            <SidebarUserFooter subLabel="Library" portalName="Library" collapsed={false} />
          </aside>
        </div>
      )}
    </>
  );
}
