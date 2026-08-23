"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/modules/admin/components/ui/ToastProvider";
import { ApiError } from "@/types/api";
import { useCreateBatch, useUpdateBatch } from "../hooks/useAcademicStructureMutations";
import type { Batch } from "../types";

interface BatchDialogProps {
  open: boolean;
  onClose: () => void;
  batch: Batch | null;
}

export function BatchDialog({ open, onClose, batch }: BatchDialogProps) {
  const [startYear, setStartYear] = useState(batch ? String(batch.start_year) : "");
  const [endYear, setEndYear] = useState(batch ? String(batch.end_year) : "");
  const [name, setName] = useState(batch?.name ?? "");
  const [nameTouched, setNameTouched] = useState(!!batch);
  const [error, setError] = useState<string | null>(null);
  const createBatch = useCreateBatch();
  const updateBatch = useUpdateBatch();
  const { show } = useToast();

  const pending = createBatch.isPending || updateBatch.isPending;

  function handleStartYearChange(value: string) {
    setStartYear(value);
    if (!nameTouched) setName(value && endYear ? `${value} – ${endYear}` : value);
  }

  function handleEndYearChange(value: string) {
    setEndYear(value);
    if (!nameTouched) setName(startYear && value ? `${startYear} – ${value}` : startYear);
  }

  function handleSave() {
    setError(null);
    const start = Number(startYear);
    const end = Number(endYear);
    const trimmedName = name.trim();

    if (!/^\d{4}$/.test(startYear)) return setError("Start year is a four-digit year.");
    if (!/^\d{4}$/.test(endYear)) return setError("End year is a four-digit year.");
    if (end <= start) return setError("The end year has to be after the start year.");
    if (end - start > 6) return setError("A batch longer than six years is almost certainly a typo.");
    if (!trimmedName) return setError("A batch needs a name.");
    if (trimmedName.length > 50) return setError("The name column holds 50 characters.");

    const input = { name: trimmedName, start_year: start, end_year: end };
    const mutation = batch ? updateBatch.mutateAsync({ id: batch.id, input }) : createBatch.mutateAsync(input);

    mutation
      .then(() => {
        show(batch ? "Batch updated" : "Batch added", "success");
        onClose();
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      });
  }

  return (
    <Modal open={open} onClose={onClose} title={batch ? "Edit batch" : "Add a batch"} subtitle="An intake year, shared across every department." className="max-w-sm">
      <div className="flex gap-2.5">
        <div className="mb-3.5 flex-1">
          <label className="mb-1 block text-[12.5px] font-semibold text-body">Start year *</label>
          <Input value={startYear} onChange={(e) => handleStartYearChange(e.target.value)} placeholder="2026" maxLength={4} />
        </div>
        <div className="mb-3.5 flex-1">
          <label className="mb-1 block text-[12.5px] font-semibold text-body">End year *</label>
          <Input value={endYear} onChange={(e) => handleEndYearChange(e.target.value)} placeholder="2030" maxLength={4} />
        </div>
      </div>
      <div className="mb-3.5">
        <label className="mb-1 block text-[12.5px] font-semibold text-body">Name *</label>
        <Input
          value={name}
          onChange={(e) => {
            setNameTouched(true);
            setName(e.target.value);
          }}
          placeholder="2026 – 2030"
          maxLength={50}
        />
        <p className="mt-1 text-[11px] text-subtle">How it appears everywhere else.</p>
      </div>
      {error && <p className="mt-1 text-[11.5px] text-danger-fg">{error}</p>}
      <div className="mt-4.5 flex justify-end gap-2.5 border-t border-border-default pt-3.5">
        <Button variant="secondary" className="w-auto px-4 py-2.5" onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        <Button variant="primarySmall" onClick={handleSave} disabled={pending}>
          {pending ? "Saving…" : batch ? "Save changes" : "Add batch"}
        </Button>
      </div>
    </Modal>
  );
}
