import type { InputHTMLAttributes } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils/cn";

export function SearchBar({ className, ...props }: InputHTMLAttributes<HTMLInputElement> & { className?: string }) {
  return (
    <div
      className={cn(
        "flex max-w-[460px] flex-1 items-center gap-2.5 rounded-[10px] border border-border-default bg-surface-input px-[13px] py-2.5",
        className,
      )}
    >
      <Icon name="search" size={19} className="text-subtle" />
      <input
        className="w-full min-w-0 border-0 bg-transparent text-[13.5px] text-ink placeholder:text-subtle focus:outline-none"
        {...props}
      />
    </div>
  );
}
