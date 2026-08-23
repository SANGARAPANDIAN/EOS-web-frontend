"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/modules/admin/components/ui/ToastProvider";
import { ApiError } from "@/types/api";
import { useEligibleStudents } from "../../hooks/useEligibleStudents";
import { useDriveReport } from "../../hooks/useDriveReport";
import { useCreateInterview, useRescheduleInterview } from "../../hooks/useInterviewMutations";
import { INTERVIEW_ROUNDS, interviewFormSchema, type InterviewFormValues } from "../../schemas/interview-form.schema";
import type { InterviewRow } from "../../types";

interface ScheduleInterviewModalProps {
  open: boolean;
  interview: InterviewRow | null;
  onClose: () => void;
}

function toDefaults(interview: InterviewRow | null): InterviewFormValues {
  return {
    studentId: interview?.studentId ?? 0,
    driveId: interview?.driveId ?? 0,
    interviewDate: interview?.interviewDate ?? "",
    roundLabel: interview?.roundLabel ?? INTERVIEW_ROUNDS[0],
    slotLabel: interview?.slotLabel ?? "",
    panelMember: interview?.panelMember ?? "",
  };
}

export function ScheduleInterviewModal({ open, interview, onClose }: ScheduleInterviewModalProps) {
  const { show } = useToast();
  const isRescheduling = interview !== null;

  const { data: students } = useEligibleStudents();
  const { data: drives } = useDriveReport();
  const createInterview = useCreateInterview();
  const rescheduleInterview = useRescheduleInterview();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<InterviewFormValues>({
    resolver: zodResolver(interviewFormSchema),
    defaultValues: toDefaults(interview),
  });

  useEffect(() => {
    reset(toDefaults(interview));
  }, [interview, open, reset]);

  function onSubmit(values: InterviewFormValues) {
    const mutation = isRescheduling
      ? rescheduleInterview.mutateAsync({
          id: interview.id,
          input: {
            interviewDate: values.interviewDate,
            roundLabel: values.roundLabel,
            slotLabel: values.slotLabel,
            panelMember: values.panelMember,
          },
        })
      : createInterview.mutateAsync(values);

    mutation
      .then(() => {
        show(isRescheduling ? "Interview rescheduled." : "Interview scheduled.", "success");
        onClose();
      })
      .catch((err: unknown) => {
        show(err instanceof ApiError ? err.message : "Something went wrong.", "error");
      });
  }

  const isPending = createInterview.isPending || rescheduleInterview.isPending;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isRescheduling ? "Reschedule interview" : "Schedule interview"}
      subtitle="Slot is checked against the student timetable."
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="mb-3.5">
          <label className="mb-1 block text-[12.5px] font-semibold text-body">Student</label>
          {isRescheduling ? (
            <Input disabled readOnly value={interview.studentName} />
          ) : (
            <Select className={errors.studentId ? "border-danger-border" : undefined} {...register("studentId", { valueAsNumber: true })}>
              <option value={0}>Select a student</option>
              {students?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name ?? s.studentIdNo}
                </option>
              ))}
            </Select>
          )}
          {errors.studentId && <p className="mt-1 text-[11.5px] text-danger-fg">{errors.studentId.message}</p>}
        </div>

        <div className="mb-3.5">
          <label className="mb-1 block text-[12.5px] font-semibold text-body">Company</label>
          {isRescheduling ? (
            <Input disabled readOnly value={`${interview.companyName}${interview.jobRole ? ` · ${interview.jobRole}` : ""}`} />
          ) : (
            <Select className={errors.driveId ? "border-danger-border" : undefined} {...register("driveId", { valueAsNumber: true })}>
              <option value={0}>Select a company</option>
              {drives?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.companyName}
                  {d.jobRole ? ` · ${d.jobRole}` : ""}
                </option>
              ))}
            </Select>
          )}
          {errors.driveId && <p className="mt-1 text-[11.5px] text-danger-fg">{errors.driveId.message}</p>}
        </div>

        <div className="mb-3.5">
          <label className="mb-1 block text-[12.5px] font-semibold text-body">Interview date</label>
          <input
            type="date"
            value={watch("interviewDate") || ""}
            onChange={(e) => setValue("interviewDate", e.target.value, { shouldValidate: true })}
            min="2020-01-01"
            max="2030-12-31"
            className={`w-full min-w-0 rounded-input border bg-surface px-[13px] py-[11px] font-sans text-sm text-ink focus:border-border-accent focus:outline-none ${errors.interviewDate ? "border-danger-border" : "border-border-default"}`}
          />
          {errors.interviewDate && <p className="mt-1 text-[11.5px] text-danger-fg">{errors.interviewDate.message}</p>}
        </div>

        <div className="mb-3.5">
          <label className="mb-1 block text-[12.5px] font-semibold text-body">Round</label>
          <Select {...register("roundLabel")}>
            {INTERVIEW_ROUNDS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
          {errors.roundLabel && <p className="mt-1 text-[11.5px] text-danger-fg">{errors.roundLabel.message}</p>}
        </div>

        <div className="mb-3.5">
          <label className="mb-1 block text-[12.5px] font-semibold text-body">Slot</label>
          <Input placeholder="e.g. 15 Aug · 11:00" className={errors.slotLabel ? "border-danger-border" : undefined} {...register("slotLabel")} />
          {errors.slotLabel && <p className="mt-1 text-[11.5px] text-danger-fg">{errors.slotLabel.message}</p>}
        </div>

        <div className="mb-3.5">
          <label className="mb-1 block text-[12.5px] font-semibold text-body">Panel member</label>
          <Input placeholder="e.g. S. Ramesh" className={errors.panelMember ? "border-danger-border" : undefined} {...register("panelMember")} />
          {errors.panelMember && <p className="mt-1 text-[11.5px] text-danger-fg">{errors.panelMember.message}</p>}
        </div>

        <div className="mt-4.5 flex justify-end gap-2.5 border-t border-border-default pt-3.5">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isPending} className="w-auto">
            Cancel
          </Button>
          <Button type="submit" variant="primarySmall" disabled={isPending}>
            {isPending ? "Saving…" : isRescheduling ? "Reschedule" : "Schedule"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
