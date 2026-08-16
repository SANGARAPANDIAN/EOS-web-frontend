import type { ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils/cn";

interface QueueRowProps {
  icon: string;
  tag?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  /** Accept/Reject buttons, a decided-state badge, a "Continue" link — whatever the caller's flow needs on the right. */
  actions?: ReactNode;
  className?: string;
}

/**
 * Icon-chip + tag + title/meta row with a hover lift, used for review-style
 * lists — the admissions queue, and anywhere else a "pending item awaiting a
 * decision" pattern shows up.
 */
export function QueueRow({ icon, tag, title, meta, actions, className }: QueueRowProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3.5 border-b border-admin-divider px-5 py-4 transition-[transform,box-shadow,border-color] duration-150 last:border-b-0 hover:-translate-y-[3px] hover:border-admin-primary hover:shadow-admin-hover",
        className,
      )}
    >
      <div className="grid size-10 shrink-0 place-items-center rounded-admin-lg bg-admin-tint-strong">
        <Icon name={icon} size={20} className="text-admin-primary-deep" />
      </div>
      <div className="min-w-0 flex-1">
        {tag && <div className="mb-1 flex flex-wrap items-center gap-2.5">{tag}</div>}
        <div className="text-[15px] font-semibold text-admin-ink">{title}</div>
        {meta && <div className="mt-0.5 text-[13px] text-admin-muted">{meta}</div>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
