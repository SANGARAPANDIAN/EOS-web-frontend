"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, FormField, Input, Modal, Select, useToast } from "@/modules/admin/components/ui";
import { friendlyError } from "@/lib/utils/errors";
import { useMarkFacultyAttendance } from "@/modules/admin/api/faculty";
import { todayDateInputValue } from "@/modules/admin/lib/faculty-format";
import { markAttendanceFormSchema, type MarkAttendanceFormValues } from "@/modules/admin/schemas/mark-attendance-form.schema";

const STATUS_OPTIONS: { value: MarkAttendanceFormValues["status"]; label: string }[] = [
  { value: "full_day", label: "Full Day" },
  { value: "half_day", label: "Half Day" },
  { value: "absent", label: "Absent" },
  { value: "on_duty", label: "On Duty" },
  { value: "on_leave", label: "On Leave" },
  { value: "weekly_off", label: "Weekly Off" },
  { value: "holiday", label: "Holiday" },
];

const ERROR_CLASS = "border-admin-danger-border focus:border-admin-danger";

export interface MarkAttendanceInitialValues {
  date: string;
  status?: MarkAttendanceFormValues["status"];
  punch_in?: string | null;
  punch_out?: string | null;
}

interface MarkAttendanceModalProps {
  open: boolean;
  facultyId: number;
  facultyName: string;
  initial: MarkAttendanceInitialValues | null;
  onClose: () => void;
}

function defaultsFor(initial: MarkAttendanceInitialValues | null): MarkAttendanceFormValues {
  return {
    date: initial?.date ?? todayDateInputValue(),
    status: initial?.status ?? "full_day",
    punch_in: initial?.punch_in ?? "",
    punch_out: initial?.punch_out ?? "",
  };
}

/**
 * Core mark-attendance form only — date/status/punch-in/punch-out against
 * PATCH /me/faculty/:id/attendance/:date. The old console's version of this
 * modal also cross-checked approved HR leave/OD requests for the same date
 * (via an HR module's useHrRequests hook) and offered to cancel a
 * conflicting request inline. That HR module doesn't exist in this repo —
 * it's a separate, out-of-scope migration — so that whole cross-check
 * sub-feature is intentionally omitted here rather than faked.
 */
export function MarkAttendanceModal({ open, facultyId, facultyName, initial, onClose }: MarkAttendanceModalProps) {
  const { show } = useToast();
  const markAttendance = useMarkFacultyAttendance();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MarkAttendanceFormValues>({
    resolver: zodResolver(markAttendanceFormSchema),
    defaultValues: defaultsFor(initial),
  });

  useEffect(() => {
    reset(defaultsFor(initial));
  }, [initial, open, reset]);

  function onSubmit(values: MarkAttendanceFormValues) {
    markAttendance.mutate(
      {
        id: facultyId,
        date: values.date,
        input: {
          status: values.status,
          punch_in: values.punch_in || undefined,
          punch_out: values.punch_out || undefined,
        },
      },
      {
        onSuccess: () => {
          show("Attendance saved.", "success");
          onClose();
        },
        onError: (err: unknown) => show(friendlyError(err), "error"),
      },
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="Mark attendance" subtitle={facultyName}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormField label="Date" error={errors.date?.message}>
          <Input type="date" className={errors.date ? ERROR_CLASS : undefined} {...register("date")} />
        </FormField>

        <FormField label="Status" error={errors.status?.message}>
          <Select className={`w-full ${errors.status ? ERROR_CLASS : ""}`} {...register("status")}>
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Punch in" hint="Optional" error={errors.punch_in?.message}>
            <Input type="time" className={errors.punch_in ? ERROR_CLASS : undefined} {...register("punch_in")} />
          </FormField>
          <FormField label="Punch out" hint="Optional" error={errors.punch_out?.message}>
            <Input type="time" className={errors.punch_out ? ERROR_CLASS : undefined} {...register("punch_out")} />
          </FormField>
        </div>

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={markAttendance.isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={markAttendance.isPending}>
            {markAttendance.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
