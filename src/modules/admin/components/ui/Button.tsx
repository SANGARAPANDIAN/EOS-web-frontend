import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type AdminButtonVariant = "primary" | "secondary" | "text" | "danger";
type AdminButtonSize = "md" | "sm";

interface AdminButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: AdminButtonVariant;
  size?: AdminButtonSize;
}

const VARIANT_CLASSES: Record<AdminButtonVariant, string> = {
  primary:
    "border-0 bg-admin-primary text-white enabled:hover:bg-admin-primary-dark disabled:bg-admin-border disabled:cursor-not-allowed",
  secondary:
    "border border-admin-border-hover bg-admin-canvas text-admin-ink enabled:hover:bg-admin-tint disabled:opacity-50 disabled:cursor-not-allowed",
  text: "border-0 bg-transparent text-admin-primary enabled:hover:text-admin-primary-dark disabled:opacity-50 disabled:cursor-not-allowed",
  danger:
    "border border-admin-danger-border bg-admin-canvas text-admin-danger enabled:hover:bg-admin-danger-bg disabled:opacity-50 disabled:cursor-not-allowed",
};

const SIZE_CLASSES: Record<AdminButtonSize, string> = {
  md: "h-11 rounded-admin-lg px-4 text-sm",
  sm: "h-[34px] rounded-admin-xs px-3.5 text-[13px]",
};

export function Button({ variant = "primary", size = "md", className, ...props }: AdminButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-2 font-sans font-semibold whitespace-nowrap transition-colors",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      {...props}
    />
  );
}
