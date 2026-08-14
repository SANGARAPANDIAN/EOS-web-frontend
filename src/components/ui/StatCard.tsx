import type { ReactNode } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { cn } from "@/lib/utils/cn";

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon: string;
  sub?: ReactNode;
  delta?: ReactNode;
  barPercent?: number;
  thresholdPercent?: number;
  href?: string;
  className?: string;
}

/** Same optional href -> Link-wrap pattern as NavTile: renders as a plain div when href is omitted. */
export function StatCard({ label, value, icon, sub, delta, barPercent, thresholdPercent, href, className }: StatCardProps) {
  const content = (
    <div
      className={cn(
        "min-w-0 rounded-card border border-border-default bg-surface p-[18px_18px_16px] transition-all duration-150 hover:-translate-y-0.5 hover:border-border-accent hover:shadow-md",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-[13px] font-bold text-body">{label}</div>
        <div className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-icon-chip">
          <Icon name={icon} size={18} className="text-primary" />
        </div>
      </div>
      <div className="mt-2.5 truncate text-[32px] font-extrabold tracking-[-.03em] text-ink">{value}</div>
      {(delta || sub) && (
        <div className="mt-0.5 text-[12.5px] text-muted">
          {delta && <span className="font-semibold text-primary">{delta} </span>}
          {sub}
        </div>
      )}
      {barPercent !== undefined && (
        <ProgressBar percent={barPercent} thresholdPercent={thresholdPercent} className="mt-3.5" />
      )}
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}
