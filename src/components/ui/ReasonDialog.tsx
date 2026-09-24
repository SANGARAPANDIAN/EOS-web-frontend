"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";

interface ReasonDialogProps {
  open: boolean;
  title: string;
  /** Field label above the textarea, e.g. "Reason for rejection". */
  label?: string;
  placeholder?: string;
  /** Disables Confirm until non-empty text is entered. Off by default (optional reason). */
  required?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

/**
 * The one dialog every approve/reject-with-a-reason flow in the app should
 * use — collects an optional or required free-text reason before a decision
 * is submitted. Not `ConfirmDialog` (that one only has a static description,
 * no input field); built on the shared `Modal` primitive the same way HoD
 * Appraisal's "send back" dialog already does, generalized so every module
 * shares one component instead of hand-rolling its own.
 */
export function ReasonDialog({
  open,
  title,
  label = "Reason",
  placeholder = "Type a reason (optional)...",
  required = false,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  loading = false,
  onConfirm,
  onCancel,
}: ReasonDialogProps) {
  const [reason, setReason] = useState("");

  const handleCancel = () => {
    setReason("");
    onCancel();
  };

  const handleConfirm = () => {
    onConfirm(reason.trim());
    setReason("");
  };

  const canConfirm = !loading && (!required || reason.trim().length > 0);

  return (
    <Modal open={open} onClose={handleCancel} title={title}>
      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-[11px] font-extrabold tracking-[.08em] text-subtle uppercase">
            {label}
            {!required && <span className="normal-case font-semibold text-subtle"> (optional)</span>}
          </label>
          <Textarea
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={placeholder}
            autoFocus
          />
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={handleCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant="primarySmall" onClick={handleConfirm} disabled={!canConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
