import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export function Checkbox({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="checkbox"
      className={cn(
        "size-4 rounded-[4px] border-admin-border-input text-admin-primary accent-admin-primary focus:ring-2 focus:ring-admin-border-hover",
        className,
      )}
      {...props}
    />
  );
}
