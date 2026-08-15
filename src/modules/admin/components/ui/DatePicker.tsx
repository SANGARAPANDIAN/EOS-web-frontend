import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

/** Styled native date input — neither this repo nor the old one pulls in a JS calendar-picker library. */
export function DatePicker({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="date"
      className={cn(
        "h-11 rounded-admin-control border border-admin-border bg-admin-canvas px-3 font-sans text-sm text-admin-ink outline-none focus:border-admin-primary disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}
