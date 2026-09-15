"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/modules/admin/components/ui/ToastProvider";
import { ApiError } from "@/types/api";
import { useBatches } from "@/modules/academic-structure/hooks/useAcademicStructureQueries";
import { useCreateCalendarPeriod, useDeleteCalendarPeriod, useUpdateCalendarPeriod } from "../hooks/useAcademicCalendarMutations";
import type { AcademicCalendarPeriod } from "../types";

interface CalendarPeriodDialogProps {
  open: boolean;
  onClose: () => void;
  period: AcademicCalendarPeriod | null;
}

export function CalendarPeriodDialog({ open, onClose, period }: CalendarPeriodDialogProps) {
  const batches = useBatches();
  const { show } = useToast();
  const createPeriod = useCreateCalendarPeriod();
  const updatePeriod = useUpdateCalendarPeriod();
  const deletePeriod = useDeleteCalendarPeriod();

  const [batchId, setBatchId] = useState(period ? String(period.batchId) : "");
  const [semester, setSemester] = useState(period ? String(period.semester) : "1");
  const [startDate, setStartDate] = useState(period?.startDate.slice(0, 10) ?? "");
  const [endDate, setEndDate] = useState(period?.endDate.slice(0, 10) ?? "");
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const isEdit = period != null;
  const isPending = createPeriod.isPending || updatePeriod.isPending;

  function handleSave() {
    setError(null);
    if (!batchId) return setError("Select a batch.");
    if (!startDate || !endDate) return setError("Start and end dates are required.");
    if (endDate <= startDate) return setError("End date must be after start date.");

    const input = { batch_id: Number(batchId), semester: Number(semester), start_date: startDate, end_date: endDate };

    (isEdit ? updatePeriod.mutateAsync({ id: period.id, input }) : createPeriod.mutateAsync(input))
      .then(() => {
        show(isEdit ? "Calendar period updated" : "Calendar period created", "success");
        onClose();
      })
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again."));
  }

  function handleDelete() {
    if (!period || deletePeriod.isPending) return;
    deletePeriod
      .mutateAsync(period.id)
      .then(() => {
        show("Calendar period deleted", "success");
        onClose();
      })
      .catch((err: unknown) => {
        show(err instanceof ApiError ? err.message : "Something went wrong.", "error");
        setConfirmingDelete(false);
      });
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title={isEdit ? "Edit calendar period" : "New calendar period"} className="max-w-md">
        <div className="mb-3.5">
          <label className="mb-1 block text-[12.5px] font-semibold text-body">Batch *</label>
          <Select value={batchId} onChange={(e) => setBatchId(e.target.value)}>
            <option value="">Select batch…</option>
            {(batches.data ?? []).map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="mb-3.5">
          <label className="mb-1 block text-[12.5px] font-semibold text-body">Semester *</label>
          <Select value={semester} onChange={(e) => setSemester(e.target.value)}>
            {Array.from({ length: 8 }, (_, i) => i + 1).map((s) => (
              <option key={s} value={s}>
                Semester {s}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex gap-2.5">
          <div className="mb-3.5 flex-1">
            <label className="mb-1 block text-[12.5px] font-semibold text-body">Start date *</label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="mb-3.5 flex-1">
            <label className="mb-1 block text-[12.5px] font-semibold text-body">End date *</label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>

        {error && <p className="mt-1 text-[11.5px] text-danger-fg">{error}</p>}

        <div className={`mt-4.5 flex items-center border-t border-border-default pt-3.5 ${isEdit ? "justify-between" : "justify-end"}`}>
          {isEdit && (
            <Button
              variant="secondary"
              className="w-auto border-danger-border px-3.5 py-2 text-danger-fg"
              onClick={() => setConfirmingDelete(true)}
              disabled={deletePeriod.isPending}
            >
              {deletePeriod.isPending ? "Deleting…" : "Delete"}
            </Button>
          )}
          <div className="flex gap-2.5">
            <Button variant="secondary" className="w-auto px-4 py-2.5" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button variant="primarySmall" onClick={handleSave} disabled={isPending}>
              {isPending ? "Saving…" : isEdit ? "Save changes" : "Create period"}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmingDelete}
        title="Delete this calendar period?"
        description="All its published events will also be removed."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </>
  );
}
