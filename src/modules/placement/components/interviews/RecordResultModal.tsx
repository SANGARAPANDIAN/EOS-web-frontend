"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal, Button, FormField, Input, Select, useToast } from "@/modules/admin/components/ui";
import { friendlyError } from "@/lib/utils/errors";
import { textFieldOptions } from "@/lib/utils/rhf-helpers";
import { useRecordInterviewResult, type InterviewRow } from "@/modules/placement/api/interviews";
import type { ApplicationStatus } from "@/modules/placement/api/types";
import { recordResultFormSchema, type RecordResultFormValues } from "@/modules/placement/schemas/record-result.schema";

/** Precise per-round labels for the officer recording an outcome — distinct from the coarser `applicationStageLabel`/`rosterStatusLabel` used everywhere this status is only ever displayed, never chosen from a list. */
const RESULT_OPTIONS: { value: ApplicationStatus; label: string }[] = [
  { value: "applied", label: "Applied" },
  { value: "r1_cleared", label: "Round 1 cleared" },
  { value: "r2_cleared", label: "Round 2 cleared" },
  { value: "r3_cleared", label: "Round 3 cleared" },
  { value: "placed", label: "Selected" },
  { value: "rejected", label: "Rejected" },
];

interface RecordResultModalProps {
  open: boolean;
  interview: InterviewRow | null;
  onClose: () => void;
}

export function RecordResultModal({ open, interview, onClose }: RecordResultModalProps) {
  const { show } = useToast();
  const recordResult = useRecordInterviewResult();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RecordResultFormValues>({
    resolver: zodResolver(recordResultFormSchema),
    defaultValues: { result: interview?.applicationStatus ?? "applied", panelFeedback: interview?.panelFeedback ?? "" },
  });

  useEffect(() => {
    reset({ result: interview?.applicationStatus ?? "applied", panelFeedback: interview?.panelFeedback ?? "" });
  }, [interview, open, reset]);

  if (!interview) return null;
  const currentInterview = interview;

  function onSubmit(values: RecordResultFormValues) {
    recordResult.mutate(
      { id: currentInterview.id, input: { result: values.result, panelFeedback: values.panelFeedback } },
      {
        onSuccess: () => {
          show("Result saved.", "success");
          onClose();
        },
        onError: (err: unknown) => show(friendlyError(err), "error"),
      },
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record interview result"
      subtitle={`${interview.studentName} · ${interview.companyName} · ${interview.roundLabel}`}
      widthClassName="max-w-lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormField label="Result" error={errors.result?.message}>
          <Select {...register("result")}>
            {RESULT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Panel feedback" error={errors.panelFeedback?.message} hint="Optional — kept on the student's file">
          <Input placeholder="Short note for the student file" {...register("panelFeedback", textFieldOptions)} />
        </FormField>

        <div className="mt-2 flex justify-end gap-2.5 border-t border-admin-divider pt-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={recordResult.isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={recordResult.isPending}>
            {recordResult.isPending ? "Saving…" : "Save result"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
