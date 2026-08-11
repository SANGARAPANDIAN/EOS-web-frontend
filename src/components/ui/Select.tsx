import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "w-full min-w-0 rounded-input border border-border-default bg-surface px-[13px] py-[11px] font-sans text-sm text-ink focus:border-border-accent focus:outline-none",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
