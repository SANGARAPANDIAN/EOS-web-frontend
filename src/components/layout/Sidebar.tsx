"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/lib/utils/cn";
import { useAuth } from "@/lib/auth/AuthContext";
import type { ModuleConfig, NavBadgeKey } from "@/modules/types";

interface SidebarProps {
  moduleConfig: ModuleConfig;
  studentName?: string;
  registerNumber?: string;
  navBadges?: Partial<Record<NavBadgeKey, ReactNode>>;
}

export function Sidebar({ moduleConfig, studentName, registerNumber, navBadges }: SidebarProps) {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <aside className="flex w-[264px] shrink-0 flex-col overflow-hidden border-r border-border-default bg-surface">
      <div className="flex items-center gap-3 border-b border-[#eef1f7] px-5 pt-5 pb-[18px]">
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
                  <Icon name={item.icon} size={19} className="w-5 text-center" />
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
        <IconButton icon="logout" size={34} iconSize={17} title="Log out" onClick={logout} />
      </div>
    </aside>
  );
}
