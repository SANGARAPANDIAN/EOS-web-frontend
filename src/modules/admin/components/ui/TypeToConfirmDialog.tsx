"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/modules/admin/components/ui/Modal";
import { Button } from "@/modules/admin/components/ui/Button";
import { cn } from "@/lib/utils/cn";

interface TypeToConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  /** The exact string the admin must type — twice — to enable the action. */
  confirmValue: string;
  confirmLabel: string;
  isPending?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * A stronger confirmation gate than ConfirmDialog's single click, for
 * actions with real consequences (revoking a person's access) — the admin
 * must type the exact value twice, mirroring a password + confirm-password
 * pattern, before the action button even becomes clickable.
 */
export function TypeToConfirmDialog({
  open,
  title,
  message,
  confirmValue,
  confirmLabel,
  isPending = false,
  onConfirm,
  onClose,
}: TypeToConfirmDialogProps) {
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");

  // Reset the typed values whenever the dialog transitions closed -> open,
  // adjusting state during render rather than an effect, which would cause
  // an extra render pass just to clear two fields.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setFirst("");
      setSecond("");
    }
  }

  const firstMatches = first.trim() === confirmValue;
  const secondMatches = second.trim() === confirmValue;
  const canConfirm = firstMatches && secondMatches;

  function fieldClass(value: string, matches: boolean) {
    return cn(
      "w-full rounded-admin-control border px-3 py-2 text-sm outline-none",
      value.length === 0
        ? "border-admin-border focus:border-admin-primary"
        : matches
          ? "border-admin-success-border focus:border-admin-success-fg"
          : "border-admin-danger-border focus:border-admin-danger",
    );
  }

  return (
    <Modal open={open} onClose={onClose} title={title} widthClassName="max-w-md">
      <div className="flex gap-3 rounded-admin-lg border border-admin-danger-border bg-admin-danger-bg p-3 text-sm text-admin-danger-fg">
        <Icon name="warning" size={20} className="mt-0.5 shrink-0" />
        <p>{message}</p>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-admin-body">
          Type <span className="font-mono font-bold text-admin-ink">{confirmValue}</span> to confirm
          <input type="text" value={first} onChange={(e) => setFirst(e.target.value)} autoComplete="off" className={fieldClass(first, firstMatches)} />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-semibold text-admin-body">
          Re-enter it to confirm
          <input type="text" value={second} onChange={(e) => setSecond(e.target.value)} autoComplete="off" className={fieldClass(second, secondMatches)} />
        </label>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={isPending}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={!canConfirm || isPending}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
