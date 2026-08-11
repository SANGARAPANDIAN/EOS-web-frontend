import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * The design reference is near-monochromatic blue: every semantic state
 * (paid/pending/approved/rejected/at-risk/etc.) reuses the same pill shape
 * with only 3 real tone combinations, plus one true danger color reserved
 * for the attendance "Absent" chip. Do not add new hues for new statuses —
 * pick the closest existing tone.
 */
export type BadgeTone = "accent" | "accentDark" | "neutral" | "danger";

const TONE_CLASSES: Record<BadgeTone, string> = {
  accent: "bg-accent-50 text-primary border-border-accent",
  accentDark: "bg-accent-50 text-primary-dark border-border-accent",
  neutral: "bg-divider text-muted border-neutral-pill-border",
  danger: "bg-danger-bg text-danger-fg border-danger-border",
};

interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}

export function Badge({ children, tone = "accent", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-pill border px-[9px] py-1 text-[10.5px] font-extrabold tracking-[.06em]",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
