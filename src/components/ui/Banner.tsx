import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface BannerProps {
  children: ReactNode;
  icon?: string;
  className?: string;
}

/** The single reused "notice" component — info, confirmation, and warning all render with this same blue treatment in the design reference. */
export function Banner({ children, className }: BannerProps) {
  return (
    <div
      className={cn(
        "rounded-[11px] border border-border-accent bg-accent-50 px-4 py-2.5 text-[13px] font-semibold text-primary-dark",
        className,
      )}
    >
      {children}
    </div>
  );
}
