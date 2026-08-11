import type { ReactNode } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils/cn";

interface NavTileProps {
  icon: string;
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  href?: string;
  className?: string;
}

/** Clickable icon+value+sub tile used in dashboard-style status strips (e.g. "My campus"). Renders as a plain div when href is omitted. */
export function NavTile({ icon, label, value, sub, href, className }: NavTileProps) {
  const content = (
    <div className={cn("rounded-card border border-border-default bg-surface p-4", href && "transition-colors hover:bg-nav-hover", className)}>
      <div className="flex items-center gap-1.5 text-[12px] font-bold text-body">
        <Icon name={icon} size={16} className="text-primary" />
        {label}
      </div>
      <div className="mt-2 text-[19px] font-extrabold tracking-[-.02em] text-ink">{value}</div>
      {sub && <div className="mt-0.5 truncate text-[11.5px] text-muted">{sub}</div>}
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}
