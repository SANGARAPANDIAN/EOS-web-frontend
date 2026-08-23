import type { ReactNode } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Card } from "@/modules/admin/components/ui/Card";
import { cn } from "@/lib/utils/cn";

interface KpiCardProps {
  label: string;
  /** Required unless `pendingReason` is set. */
  value?: ReactNode;
  icon?: string;
  /** Highlighted delta shown next to `sub`, e.g. "+4 vs last year" or a mean-attendance figure. */
  delta?: ReactNode;
  sub?: ReactNode;
  /** 0-100 — renders a thin progress bar under the delta/sub row. */
  progress?: number;
  footnote?: ReactNode;
  /** The reference's one non-white KPI card style, used for a single emphasized metric (e.g. "Fees pending"). */
  tinted?: boolean;
  /**
   * When set, the card shows this explanation instead of a value — for a
   * metric with no real backend source yet. Never fabricate a number here;
   * say plainly what endpoint/schema decision it's waiting on.
   */
  pendingReason?: ReactNode;
  className?: string;
  /** Navigates to the relevant page when set — only pass this when that page actually exists in the sidebar. Renders as a plain (non-clickable) card when omitted. */
  href?: string;
}

export function KpiCard({
  label,
  value,
  icon,
  delta,
  sub,
  progress,
  footnote,
  tinted,
  pendingReason,
  className,
  href,
}: KpiCardProps) {
  const content = (
    <Card
      className={cn(
        "flex min-h-[152px] flex-col p-[18px]",
        tinted && "border-admin-border-hover bg-admin-tint-strong",
        pendingReason && "border-dashed",
        href && "transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className={cn("text-sm font-semibold", tinted ? "text-admin-primary-deep" : "text-admin-body")}>
          {label}
        </div>
        {icon && (
          <div className="grid size-9 shrink-0 place-items-center rounded-admin-sm bg-admin-tint-strong">
            <Icon name={icon} size={18} className="text-admin-primary" />
          </div>
        )}
      </div>

      {pendingReason ? (
        <div className="mt-2 flex flex-1 flex-col justify-center">
          <p className="text-lg font-semibold text-admin-border-hover">—</p>
          <p className="mt-1 text-xs leading-snug text-admin-subtle">{pendingReason}</p>
        </div>
      ) : (
        <div
          className={cn(
            "mt-2 font-sans text-[32px] font-extrabold tracking-[-.02em]",
            tinted ? "text-admin-primary-deep" : "text-admin-ink",
          )}
        >
          {value}
        </div>
      )}
      {!pendingReason && (delta || sub) && (
        <div className="mt-1 flex items-baseline gap-2 text-[13px]">
          {delta && (
            <span className={cn("font-bold", tinted ? "text-admin-primary-dark" : "text-admin-primary")}>
              {delta}
            </span>
          )}
          {sub && <span className={tinted ? "text-admin-primary-dark" : "text-admin-muted"}>{sub}</span>}
        </div>
      )}
      {!pendingReason && progress !== undefined && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-admin-pill bg-admin-tint-deep">
          <div
            className="h-full rounded-admin-pill bg-admin-primary"
            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
          />
        </div>
      )}
      {!pendingReason && footnote && <div className="mt-2 text-[12.5px] text-admin-subtle">{footnote}</div>}
    </Card>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}
