import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full min-w-0 resize-y rounded-input border border-border-default bg-surface px-[13px] py-[11px] font-sans text-sm text-ink placeholder:text-subtle focus:border-border-accent focus:outline-none",
        className,
      )}
      {...props}
    />
  );
}
