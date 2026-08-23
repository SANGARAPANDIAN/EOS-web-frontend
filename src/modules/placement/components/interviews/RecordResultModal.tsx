"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/modules/admin/components/ui/ToastProvider";
import { ApiError } from "@/types/api";
import { useRecordInterviewResult } from "../../hooks/useInterviewMutations";
import type { ApplicationStatus, InterviewRow } from "../../types";

const RESULT_OPTIONS: { value: ApplicationStatus; label: string }[] = [
  { value: "applied", label: "Applied" },
  { value: "r1_cleared", label: "Round 1" },
  { value: "r2_cleared", label: "Round 2" },
  { value: "r3_cleared", label: "Round 3" },
  { value: "placed", label: "Selected" },
  { value: "rejected", label: "Rejected" },
];

const resultFormSchema = z.object({
  result: z.enum(["applied", "r1_cleared", "r2_cleared", "r3_cleared", "placed", "rejected"]),
  panelFeedback: z.string().trim().max(500).optional(),
});

type ResultFormValues = z.infer<typeof resultFormSchema>;

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
  } = useForm<ResultFormValues>({
    resolver: zodResolver(resultFormSchema),
    defaultValues: { result: interview?.applicationStatus ?? "applied", panelFeedback: interview?.panelFeedback ?? "" },
  });

  useEffect(() => {
    reset({ result: interview?.applicationStatus ?? "applied", panelFeedback: interview?.panelFeedback ?? "" });
  }, [interview, open, reset]);

  if (!interview) return null;
  const currentInterview = interview;

  function onSubmit(values: ResultFormValues) {
    recordResult.mutate(
      { id: currentInterview.id, input: { result: values.result, panelFeedback: values.panelFeedback } },
      {
        onSuccess: () => {
          show("Result saved.", "success");
          onClose();
        },
        onError: (err: unknown) => show(err instanceof ApiError ? err.message : "Something went wrong.", "error"),
      },
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="Record interview result" subtitle={`${interview.studentName} · ${interview.companyName} · ${interview.roundLabel}`}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="mb-3.5">
          <label className="mb-1 block text-[12.5px] font-semibold text-body">Result</label>
          <Select {...register("result")}>
            {RESULT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          {errors.result && <p className="mt-1 text-[11.5px] text-danger-fg">{errors.result.message}</p>}
        </div>

        <div className="mb-3.5">
          <label className="mb-1 block text-[12.5px] font-semibold text-body">Panel feedback</label>
          <Input placeholder="Short note for the student file" className={errors.panelFeedback ? "border-danger-border" : undefined} {...register("panelFeedback")} />
          {errors.panelFeedback && <p className="mt-1 text-[11.5px] text-danger-fg">{errors.panelFeedback.message}</p>}
        </div>

        <div className="mt-4.5 flex justify-end gap-2.5 border-t border-border-default pt-3.5">
          <Button type="button" variant="secondary" onClick={onClose} disabled={recordResult.isPending} className="w-auto">
            Cancel
          </Button>
          <Button type="submit" variant="primarySmall" disabled={recordResult.isPending}>
            {recordResult.isPending ? "Saving…" : "Save result"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
