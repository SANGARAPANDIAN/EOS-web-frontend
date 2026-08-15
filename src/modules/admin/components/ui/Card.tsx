import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Disable the hover lift for cards that shouldn't feel clickable (e.g. a filter-bar wrapper). */
  hoverable?: boolean;
}

/**
 * Base surface for the admin console — bordered white card with the
 * Principal Command Center reference's signature hover lift (translateY +
 * border/shadow shift). KpiCard, DataTable panels, FilterBar, and QueueRow
 * all build on this.
 */
export function Card({ hoverable = true, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-admin-card border border-admin-border bg-admin-canvas shadow-admin-resting transition-[transform,box-shadow,border-color] duration-150",
        hoverable && "hover:-translate-y-[3px] hover:border-admin-primary hover:shadow-admin-hover",
        className,
      )}
      {...props}
    />
  );
}
