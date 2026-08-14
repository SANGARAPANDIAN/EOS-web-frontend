import type { ReactNode } from "react";
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
  className?: string;
  /** One card per row gets this in the reference design — a solid primary border/shadow instead of the plain gray one, drawing the eye to whichever KPI needs it most (e.g. equipment not yet returned). */
  accent?: boolean;
}

export function StatCard({ label, value, icon, sub, delta, barPercent, thresholdPercent, className, accent }: StatCardProps) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-card border bg-surface p-[18px_18px_16px]",
        accent ? "border-[1.5px] border-primary shadow-[0_8px_20px_color-mix(in_srgb,var(--color-primary)_14%,transparent)]" : "border-border-default",
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
}
