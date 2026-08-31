"use client";

import { useState, type ReactNode } from "react";
import { Button, Input, SegmentedTabs, Select, Textarea } from "@/components/ui";
import { useCreateHrVacationEntry } from "@/modules/hr/api/requests";
import { HrFacultyPicker } from "@/modules/hr/components/HrFacultyPicker";
import type { HrFaculty } from "@/modules/hr/api/facultyDirectory";
import { useLeaveTypes } from "@/modules/hr/api/leaveTypes";
import { todayDateOnly } from "@/lib/utils/date";
import { ApiError } from "@/types/api";

/** A labelled cell, so a form reads as a form rather than a row of loose controls. */
export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[.05em] text-muted">{label}</label>
      {children}
    </div>
  );
}

/**
 * The "record a leave/OD entry directly on someone's behalf" form — shared
 * by Vacation Management's AddEntryModal and the Requests page's
 * RecordEntryModal, which used to hand-roll the exact same fields (faculty
 * picker, kind toggle, date range, leave type, reason) independently. Each
 * caller supplies its own outer <Modal title/subtitle>; this owns the
 * fields, validation, and the Cancel/Save footer.
 */
export function RecordVacationEntryForm({ onClose }: { onClose: () => void }) {
  const createEntry = useCreateHrVacationEntry();
  const leaveTypes = useLeaveTypes();

  const [faculty, setFaculty] = useState<HrFaculty | null>(null);
  const [kind, setKind] = useState<"leave" | "od">("leave");
  const [fromDate, setFromDate] = useState(todayDateOnly());
  const [toDate, setToDate] = useState(todayDateOnly());
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  function updateFromDate(value: string) {
    setFromDate(value);
    if (value && toDate && value > toDate) setToDate(value);
  }

  async function submit() {
    if (faculty === null) {
      setError("Choose a faculty member.");
      return;
    }
    if (!fromDate || !toDate) {
      setError("Choose a from date and to date.");
      return;
    }
    if (fromDate > toDate) {
      setError("From date must not be after to date.");
      return;
    }
    if (kind === "leave" && !leaveTypeId) {
      setError("Pick a leave type.");
      return;
    }
    setError(null);
    try {
      await createEntry.mutateAsync({
        faculty_id: faculty.id,
        kind,
        from_date: fromDate,
        to_date: toDate,
        reason: reason.trim() || undefined,
        leave_type_id: kind === "leave" ? Number(leaveTypeId) : undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save this entry.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Field label="Faculty">
        <HrFacultyPicker value={faculty} onChange={setFaculty} />
      </Field>

      <Field label="Kind">
        <SegmentedTabs
          value={kind}
          onChange={(k) => setKind(k as "leave" | "od")}
          options={[
            { key: "leave", label: "Leave" },
            { key: "od", label: "On duty" },
          ]}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="From date">
          <Input type="date" value={fromDate} onChange={(e) => updateFromDate(e.target.value)} />
        </Field>
        <Field label="To date">
          <Input type="date" value={toDate} min={fromDate || undefined} onChange={(e) => setToDate(e.target.value)} />
        </Field>
        {kind === "leave" && (
          <Field label="Leave type">
            <Select value={leaveTypeId} onChange={(e) => setLeaveTypeId(e.target.value)}>
              <option value="">Select type</option>
              {leaveTypes.data?.map((lt) => (
                <option key={lt.id} value={lt.id}>
                  {lt.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </div>

      <Field label="Reason">
        <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Optional note" />
      </Field>

      {error && <div className="text-[13px] font-semibold text-danger-fg">{error}</div>}

      <div className="mt-2 flex justify-end gap-2.5 border-t border-divider pt-5">
        <Button variant="secondary" className="w-auto" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primarySmall" className="w-auto px-6" onClick={submit} disabled={createEntry.isPending}>
          {createEntry.isPending ? "Saving…" : "Save entry"}
        </Button>
      </div>
    </div>
  );
}
