"use client";

import { useEffect, type ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  eyebrow?: string;
  title: string;
  headActions?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}

/** Right-hand slide-in panel — quick-view over a row without leaving the list. */
export function Drawer({ open, onClose, eyebrow, title, headActions, footer, children }: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-[rgba(13,30,79,.28)]" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[480px] flex-col bg-admin-canvas shadow-admin-modal"
      >
        <div className="flex items-center justify-between gap-4 border-b border-admin-border px-5 py-4">
          <div className="min-w-0">
            {eyebrow && <div className="text-xs font-semibold tracking-wide text-admin-subtle uppercase">{eyebrow}</div>}
            <h2 className="truncate font-sans text-base font-bold text-admin-ink">{title}</h2>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {headActions}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close panel"
              className="rounded-admin-sm p-1.5 text-admin-subtle hover:bg-admin-tint-strong hover:text-admin-body"
            >
              <Icon name="close" size={18} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <div className="flex gap-3 border-t border-admin-border bg-admin-tint px-5 py-4">{footer}</div>}
      </aside>
    </>
  );
}
