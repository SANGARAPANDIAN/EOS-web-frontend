import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

interface FilterPillProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

/** Standalone toggle chip for a filter row — "All students", "Attendance < 75%", "Fees pending", etc. */
export function FilterPill({ active, className, ...props }: FilterPillProps) {
  return (
    <button
      type="button"
      className={cn(
        "h-9 cursor-pointer rounded-admin-pill border px-3.5 text-[13px] font-semibold whitespace-nowrap transition-colors",
        active
          ? "border-admin-primary bg-admin-primary text-white"
          : "border-admin-border bg-admin-canvas text-admin-body hover:bg-admin-tint-strong",
        className,
      )}
      {...props}
    />
  );
}
