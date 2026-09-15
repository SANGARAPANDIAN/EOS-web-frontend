import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        "w-full min-w-0 rounded-input border border-border-default bg-surface px-[13px] py-[11px] font-sans text-sm text-ink placeholder:text-subtle focus:border-border-accent focus:outline-none",
        className,
      )}
      {...props}
    />
  );
});
