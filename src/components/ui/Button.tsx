import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";
import { Spinner } from "@/components/ui/Spinner";

type ButtonVariant = "primary" | "primarySmall" | "secondary" | "text";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  /** Shows a spinner before the label and disables the button — for an in-flight mutation. */
  loading?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "w-full rounded-xl px-4 py-3.5 text-[15px] font-extrabold text-white bg-primary disabled:bg-disabled disabled:cursor-not-allowed enabled:hover:bg-primary-dark transition-colors",
  primarySmall:
    "rounded-[10px] px-[17px] py-2.5 text-[13px] font-bold text-white bg-primary disabled:bg-disabled disabled:cursor-not-allowed enabled:hover:bg-primary-dark transition-colors",
  secondary:
    "rounded-[11px] px-[22px] py-[13px] text-sm font-bold text-primary bg-surface border-[1.5px] border-border-accent enabled:hover:bg-nav-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors",
  text: "border-0 bg-transparent text-[13px] font-bold text-primary enabled:hover:text-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors",
};

export function Button({ variant = "primary", loading, disabled, className, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        VARIANT_CLASSES[variant],
        "cursor-pointer font-sans",
        loading && "inline-flex items-center justify-center gap-2",
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner size={14} />}
      {children}
    </button>
  );
}
