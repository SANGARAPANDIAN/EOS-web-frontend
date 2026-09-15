"use client";

import { cn } from "@/lib/utils/cn";

interface ToggleProps {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

/** Small pill switch — Settings' "Roles and access" grid and Notifications' "Delivery channels" are the only two places in the design reference that need on/off state, so this stays a plain button rather than a full form-library control. */
export function Toggle({ checked, onChange, disabled, className }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
        checked ? "bg-primary" : "bg-divider",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        className,
      )}
    >
      <span
        className={cn(
          "inline-block size-[18px] rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-[22px]" : "translate-x-[3px]",
        )}
      />
    </button>
  );
}
