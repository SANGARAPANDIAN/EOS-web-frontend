import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        // w-full + min-w-0 so a long option (e.g. a full course name) sizes
        // to its own box instead of the native <select>'s intrinsic content
        // width — without these, a long option makes the control spill into
        // the next grid column instead of clipping within its own border.
        // Callers that want a narrower fixed/auto width (filter bars etc.)
        // still win via cn()'s tailwind-merge, which resolves the conflict
        // in the caller's favor.
        "h-11 w-full min-w-0 rounded-admin-control border border-admin-border bg-admin-canvas px-3 font-sans text-sm text-admin-ink outline-none focus:border-admin-primary disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
