import type { InputHTMLAttributes } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils/cn";

interface AdminInputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Material Symbols ligature name for a leading icon, e.g. "search". */
  leadingIcon?: string;
}

const FIELD_CLASSES =
  "h-11 w-full rounded-admin-control border border-admin-border bg-admin-canvas px-3 font-sans text-sm text-admin-ink outline-none placeholder:text-admin-muted focus:border-admin-primary disabled:cursor-not-allowed disabled:opacity-60";

export function Input({ leadingIcon, className, ...props }: AdminInputProps) {
  if (!leadingIcon) {
    return <input className={cn(FIELD_CLASSES, className)} {...props} />;
  }
  return (
    <label
      className={cn(
        "flex h-11 items-center gap-2.5 rounded-admin-control border border-admin-border bg-admin-canvas px-3.5 has-[input:focus]:border-admin-primary",
        className,
      )}
    >
      <Icon name={leadingIcon} size={20} className="text-admin-muted" />
      <input
        className="min-w-0 flex-1 border-0 bg-transparent font-sans text-sm text-admin-ink outline-none placeholder:text-admin-muted"
        {...props}
      />
    </label>
  );
}
