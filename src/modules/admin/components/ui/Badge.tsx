import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export type BadgeTone = "primary" | "success" | "warning" | "danger" | "neutral";

const TONE_CLASSES: Record<BadgeTone, string> = {
  primary: "bg-admin-tint-strong text-admin-primary-deep border-admin-border-hover",
  success: "bg-admin-success-bg text-admin-success-fg border-admin-success-border",
  warning: "bg-admin-warning-bg text-admin-warning-fg border-admin-warning-border",
  danger: "bg-admin-danger-bg text-admin-danger-fg border-admin-danger-border",
  neutral: "bg-admin-tint text-admin-muted border-admin-border",
};

interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}

/** Pill-shaped status/type chip — fee status, placement status, admission decision, request type tags. */
export function Badge({ tone = "neutral", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-block shrink-0 rounded-admin-pill border px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
