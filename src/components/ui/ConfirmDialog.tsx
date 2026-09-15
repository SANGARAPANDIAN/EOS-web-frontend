"use client";

import { createPortal } from "react-dom";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Generic confirm/cancel modal — used for sign-out and any other action that shouldn't fire on a single accidental click. */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fade-in"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-border-default bg-surface p-6 shadow-[0_20px_50px_rgba(15,23,42,0.18)] animate-pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={cn(
            "grid size-11 place-items-center rounded-full",
            destructive ? "bg-danger-bg text-danger-fg" : "bg-icon-chip text-primary",
          )}
        >
          <Icon name={destructive ? "logout" : "help"} size={22} />
        </div>
        <div className="mt-4 text-[17px] font-extrabold text-ink">{title}</div>
        {description && <p className="mt-1.5 text-sm text-muted">{description}</p>}
        <div className="mt-6 flex justify-end gap-2.5">
          <Button variant="secondary" className="w-auto px-4 py-2.5" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <button
            type="button"
            onClick={onConfirm}
            className={cn(
              "rounded-[11px] px-4 py-2.5 text-sm font-bold text-white transition-colors",
              destructive ? "bg-danger-fg hover:opacity-90" : "bg-primary hover:bg-primary-dark",
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
