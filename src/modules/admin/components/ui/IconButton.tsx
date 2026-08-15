import type { ButtonHTMLAttributes } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils/cn";

interface AdminIconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: string;
  size?: number;
  iconSize?: number;
}

/** Square bordered icon button — topbar actions (add, notifications, settings), sidebar collapse toggle. */
export function IconButton({ icon, size = 38, iconSize = 20, className, ...props }: AdminIconButtonProps) {
  return (
    <button
      className={cn(
        "grid shrink-0 cursor-pointer place-items-center rounded-admin-md border border-admin-border bg-admin-canvas text-admin-body transition-colors hover:border-admin-border-hover hover:bg-admin-tint-strong",
        className,
      )}
      style={{ width: size, height: size }}
      {...props}
    >
      <Icon name={icon} size={iconSize} />
    </button>
  );
}
