"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/modules/admin/components/ui/ToastProvider";
import { ApiError } from "@/types/api";
import { useCreateBatch, useUpdateBatch } from "../hooks/useAcademicStructureMutations";
import { submitApprovalRequest } from "@/modules/shared/api/approvalRequests";
import type { Batch } from "../types";

interface BatchDialogProps {
  open: boolean;
  onClose: () => void;
  /** Omit to create a new batch; pass one to edit it. */
  batch?: Batch;
}

const currentYear = new Date().getFullYear();

export function BatchDialog({ open, onClose, batch }: BatchDialogProps) {
  const [startYear, setStartYear] = useState(String(batch?.start_year ?? currentYear));
  const [endYear, setEndYear] = useState(String(batch?.end_year ?? currentYear + 4));
  const [error, setError] = useState<string | null>(null);
  const [submittingForReview, setSubmittingForReview] = useState(false);
  const createBatch = useCreateBatch();
  const updateBatch = useUpdateBatch();
  const { show } = useToast();

  const pending = createBatch.isPending || updateBatch.isPending || submittingForReview;

  function validate(): { name: string; start_year: number; end_year: number } | null {
    setError(null);
    const start = Number(startYear);
    const end = Number(endYear);
    if (!start || !end) {
      setError("Both years are required.");
      return null;
    }
    if (end <= start) {
      setError("End year must be after the start year.");
      return null;
    }
    return { name: `${start}-${end}`, start_year: start, end_year: end };
  }

  function handleSave() {
    const input = validate();
    if (!input) return;

    const mutation = batch
      ? updateBatch.mutateAsync({ id: batch.id, input })
      : createBatch.mutateAsync(input);

    mutation
      .then(() => {
        show(batch ? "Batch updated" : "Batch created", "success");
        onClose();
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      });
  }

  function handleSubmitForReview() {
    const input = validate();
    if (!input) return;

    setSubmittingForReview(true);
    submitApprovalRequest
      .batch(input)
      .then(() => {
        show("Submitted for the Principal's review", "success");
        onClose();
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      })
      .finally(() => setSubmittingForReview(false));
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={batch ? "Edit batch" : "Add batch"}
      subtitle="An intake shared by every department, e.g. 2026-2030."
      className="max-w-lg"
    >
      <div className="flex gap-2.5">
        <div className="mb-3.5 flex-1">
          <label className="mb-1 block text-[12.5px] font-semibold text-body">Start year *</label>
          <Input type="number" value={startYear} onChange={(e) => setStartYear(e.target.value)} />
        </div>
        <div className="mb-3.5 flex-1">
          <label className="mb-1 block text-[12.5px] font-semibold text-body">End year *</label>
          <Input type="number" value={endYear} onChange={(e) => setEndYear(e.target.value)} />
        </div>
      </div>
      <p className="text-[11px] text-subtle">Name is derived automatically: {startYear || "—"}-{endYear || "—"}</p>
      {error && <p className="mt-1 text-[11.5px] text-danger-fg">{error}</p>}

      <div className="mt-4.5 flex items-center justify-end gap-2.5 border-t border-border-default pt-3.5">
        {!batch && (
          <button
            type="button"
            onClick={handleSubmitForReview}
            disabled={pending}
            className="mr-auto text-[12.5px] font-semibold text-body underline decoration-dotted disabled:opacity-50"
          >
            {submittingForReview ? "Submitting…" : "Submit for review instead"}
          </button>
        )}
        <Button variant="secondary" className="w-auto px-4 py-2.5" onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        <Button variant="primarySmall" onClick={handleSave} disabled={pending}>
          {createBatch.isPending || updateBatch.isPending ? "Saving…" : batch ? "Save changes" : "Create batch"}
        </Button>
      </div>
    </Modal>
  );
}
