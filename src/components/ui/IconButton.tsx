import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";
import { Icon } from "@/components/ui/Icon";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: string;
  size?: number;
  iconSize?: number;
}

export function IconButton({ icon, size = 38, iconSize = 19, className, ...props }: IconButtonProps) {
  return (
    <button
      className={cn(
        "flex items-center justify-center rounded-[9px] border border-border-default bg-surface cursor-pointer hover:bg-surface-input transition-colors",
        className,
      )}
      style={{ width: size, height: size }}
      {...props}
    >
      <Icon name={icon} size={iconSize} />
    </button>
  );
}
