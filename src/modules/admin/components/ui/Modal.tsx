"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils/cn";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  widthClassName?: string;
}

export function Modal({ open, onClose, title, subtitle, children, widthClassName = "max-w-lg" }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
      className={cn(
        "fixed top-1/2 left-1/2 m-0 max-h-[85vh] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-admin-modal border border-admin-border p-0 shadow-admin-modal backdrop:bg-[rgba(13,30,79,.28)]",
        widthClassName,
      )}
    >
      <div className="flex items-center justify-between border-b border-admin-divider px-5 py-4">
        <div>
          <h3 className="font-sans text-base font-bold text-admin-ink">{title}</h3>
          {subtitle && <p className="mt-0.5 text-sm text-admin-muted">{subtitle}</p>}
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="grid size-[34px] shrink-0 cursor-pointer place-items-center rounded-admin-sm border border-admin-border text-admin-body hover:bg-admin-tint-strong"
        >
          <Icon name="close" size={18} />
        </button>
      </div>
      <div className="px-5 py-5">{children}</div>
    </dialog>
  );
}
