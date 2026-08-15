"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal, Button, FormField, Input, Select, Typeahead, DatePicker, useToast } from "@/modules/admin/components/ui";
import { friendlyError } from "@/lib/utils/errors";
import { textFieldOptions } from "@/lib/utils/rhf-helpers";
import { useEligibleStudents, type EligibleStudent } from "@/modules/placement/api/students";
import { useDriveReport, type DriveReportRow } from "@/modules/placement/api/drives";
import { useCreateInterview, useRescheduleInterview } from "@/modules/placement/api/interviews";
import type { InterviewRow } from "@/modules/placement/api/interviews";
import { INTERVIEW_ROUNDS, interviewFormSchema, type InterviewFormValues } from "@/modules/placement/schemas/interview-form.schema";

interface ScheduleInterviewModalProps {
  open: boolean;
  interview: InterviewRow | null;
  onClose: () => void;
}

function toDefaults(interview: InterviewRow | null): InterviewFormValues {
  return {
    studentId: interview?.studentId ?? 0,
    driveId: interview?.driveId ?? 0,
    interviewDate: interview?.interviewDate.slice(0, 10) ?? "",
    roundLabel: interview?.roundLabel ?? INTERVIEW_ROUNDS[0],
    slotLabel: interview?.slotLabel ?? "",
    panelMember: interview?.panelMember ?? "",
  };
}

/** Schedule (new interview) and reschedule (existing interview) share one form — student/company stay locked once an interview already exists, matching the source app's behavior. */
export function ScheduleInterviewModal({ open, interview, onClose }: ScheduleInterviewModalProps) {
  const { show } = useToast();
  const isRescheduling = interview !== null;

  const { data: students } = useEligibleStudents();
  const { data: drives } = useDriveReport();
  const createInterview = useCreateInterview();
  const rescheduleInterview = useRescheduleInterview();

  const [studentQuery, setStudentQuery] = useState("");
  const [driveQuery, setDriveQuery] = useState("");

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
    setStudentQuery("");
    setDriveQuery("");
  }, [interview, open, reset]);

  const studentResults = useMemo(() => {
    const q = studentQuery.trim().toLowerCase();
    if (!q) return [];
    return (students ?? [])
      .filter((s) => (s.name ?? "").toLowerCase().includes(q) || s.studentIdNo.toLowerCase().includes(q) || (s.rollNo ?? "").toLowerCase().includes(q))
      .slice(0, 20);
  }, [students, studentQuery]);

  const driveResults = useMemo(() => {
    const q = driveQuery.trim().toLowerCase();
    if (!q) return [];
    return (drives ?? [])
      .filter((d) => d.companyName.toLowerCase().includes(q) || (d.jobRole ?? "").toLowerCase().includes(q))
      .slice(0, 20);
  }, [drives, driveQuery]);

  // eslint-disable-next-line react-hooks/incompatible-library -- react-hook-form's watch() is inherently un-memoizable; calling it here (during render, the documented way) is correct even though the compiler can't verify it.
  const selectedStudent = students?.find((s) => s.id === watch("studentId"));
  const selectedDrive = drives?.find((d) => d.id === watch("driveId"));

  function selectStudent(s: EligibleStudent) {
    setValue("studentId", s.id, { shouldValidate: true });
    setStudentQuery("");
  }

  function selectDrive(d: DriveReportRow) {
    setValue("driveId", d.id, { shouldValidate: true });
    setDriveQuery("");
  }

  function onSubmit(values: InterviewFormValues) {
    const mutation =
      isRescheduling && interview
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
      .catch((err: unknown) => show(friendlyError(err), "error"));
  }

  const isPending = createInterview.isPending || rescheduleInterview.isPending;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isRescheduling ? "Reschedule interview" : "Schedule interview"}
      subtitle="Slot and panel are recorded exactly as entered — check the student timetable before saving."
      widthClassName="max-w-lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormField label="Student" error={errors.studentId?.message}>
          {isRescheduling ? (
            <Input disabled readOnly value={interview.studentName} />
          ) : (
            <>
              <Typeahead
                value={studentQuery}
                onChange={setStudentQuery}
                results={studentResults}
                getKey={(s) => s.id}
                renderResult={(s) => (
                  <>
                    <span className="text-sm font-semibold text-admin-ink">{s.name ?? s.studentIdNo}</span>
                    <span className="text-xs text-admin-muted">
                      {s.studentIdNo}
                      {s.classLabel ? ` · ${s.classLabel}` : ""}
                    </span>
                  </>
                )}
                onSelect={selectStudent}
                placeholder="Search by name, ID or roll number"
              />
              {selectedStudent && (
                <p className="mt-1.5 text-[13px] text-admin-body">
                  Selected: <span className="font-semibold">{selectedStudent.name ?? selectedStudent.studentIdNo}</span>
                </p>
              )}
            </>
          )}
        </FormField>

        <FormField label="Company / drive" error={errors.driveId?.message}>
          {isRescheduling ? (
            <Input disabled readOnly value={`${interview.companyName}${interview.jobRole ? ` · ${interview.jobRole}` : ""}`} />
          ) : (
            <>
              <Typeahead
                value={driveQuery}
                onChange={setDriveQuery}
                results={driveResults}
                getKey={(d) => d.id}
                renderResult={(d) => (
                  <>
                    <span className="text-sm font-semibold text-admin-ink">{d.companyName}</span>
                    <span className="text-xs text-admin-muted">{d.jobRole ?? "Role not specified"}</span>
                  </>
                )}
                onSelect={selectDrive}
                placeholder="Search by company or role"
              />
              {selectedDrive && (
                <p className="mt-1.5 text-[13px] text-admin-body">
                  Selected: <span className="font-semibold">{selectedDrive.companyName}</span>
                  {selectedDrive.jobRole ? ` · ${selectedDrive.jobRole}` : ""}
                </p>
              )}
            </>
          )}
        </FormField>

        <FormField label="Interview date" error={errors.interviewDate?.message}>
          <DatePicker
            value={watch("interviewDate") || ""}
            onChange={(e) => setValue("interviewDate", e.target.value, { shouldValidate: true })}
            min="2020-01-01"
            max="2030-12-31"
          />
        </FormField>

        <FormField label="Round" error={errors.roundLabel?.message}>
          <Select {...register("roundLabel")}>
            {INTERVIEW_ROUNDS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Slot" error={errors.slotLabel?.message}>
          <Input placeholder="e.g. 15 Aug · 11:00" {...register("slotLabel", textFieldOptions)} />
        </FormField>

        <FormField label="Panel member" error={errors.panelMember?.message}>
          <Input placeholder="e.g. S. Ramesh" {...register("panelMember", textFieldOptions)} />
        </FormField>

        <div className="mt-2 flex justify-end gap-2.5 border-t border-admin-divider pt-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isPending}>
            {isPending ? "Saving…" : isRescheduling ? "Reschedule" : "Schedule"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
