"use client";

import { forwardRef, useImperativeHandle, useState, type ReactNode } from "react";
import { Avatar, Badge, Button, ConfirmDialog, Icon, Input, SegmentedTabs } from "@/components/ui";
import { useCreateGateLogEntry, useLookupStudent, type GateEntryType } from "@/modules/gate-warden/api/gateLog";
import { formatDisplayDate } from "@/lib/utils/date";
import { ApiError } from "@/types/api";

function titleCase(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div>
      <p className="text-[10.5px] font-extrabold tracking-[.07em] text-subtle uppercase">{label}</p>
      <p className="mt-0.5 text-[13.5px] text-body">{value}</p>
    </div>
  );
}

export interface GateSearchPanelHandle {
  /** Runs a lookup directly, e.g. when the Warden picks a queued student from the pending-exits/returns lists. */
  search: (rollNo: string) => void;
}

/**
 * The actual gate checkpoint: search a student by roll number — any student,
 * hosteller or day scholar — see who they are and whether the Hostel Warden
 * has already approved an outing for them, then the Gate Warden gives their
 * own separate approval by logging the movement. That log entry (not a
 * status field) is the record of the Gate Warden's approval.
 */
export const GateSearchPanel = forwardRef<GateSearchPanelHandle>(function GateSearchPanel(_props, ref) {
  const [rollNo, setRollNo] = useState("");
  const [direction, setDirection] = useState<GateEntryType>("out");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const lookup = useLookupStudent();
  const createEntry = useCreateGateLogEntry();
  const [toast, setToast] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  function runSearch(trimmed: string) {
    if (!trimmed) return;
    setToast(null);
    lookup.mutate(trimmed, {
      // Default off is_currently_out, not pending_outing — a student can be
      // off campus with no outing at all (e.g. a day scholar), and someone
      // returning from an approved outing should default to Check-in.
      onSuccess: (data) => setDirection(data.is_currently_out ? "in" : "out"),
    });
  }

  useImperativeHandle(ref, () => ({
    search: (nextRollNo: string) => {
      setRollNo(nextRollNo);
      runSearch(nextRollNo);
    },
  }));

  const result = lookup.data;

  function handleSearch() {
    runSearch(rollNo.trim());
  }

  function handleConfirm() {
    if (!result) return;
    createEntry.mutate(
      {
        student_id: result.student.id,
        entry_type: direction,
        outing_id: result.pending_outing?.outing_id,
      },
      {
        onSuccess: () => {
          setToast({
            tone: "success",
            message: `${direction === "out" ? "Check-out" : "Check-in"} recorded for ${result.student.name}.`,
          });
          setConfirmOpen(false);
          lookup.reset();
          setRollNo("");
        },
        onError: (err: unknown) => {
          setToast({ tone: "error", message: err instanceof ApiError ? err.message : "Something went wrong." });
        },
      },
    );
  }

  return (
    <div className="rounded-card border border-border-default bg-surface p-6">
      <h3 className="text-[16px] font-extrabold text-ink">Search by roll number</h3>
      <p className="mt-1 text-[13px] text-muted">
        Look up a student when they reach the gate to verify who they are and whether they&apos;re cleared to leave.
      </p>

      <div className="mt-4 flex gap-2">
        <Input
          value={rollNo}
          onChange={(e) => setRollNo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSearch();
          }}
          placeholder="Enter roll number"
          className="max-w-xs"
        />
        <Button variant="primarySmall" className="w-auto inline-flex items-center gap-1.5 px-4" onClick={handleSearch} disabled={lookup.isPending}>
          <Icon name="search" size={16} />
          {lookup.isPending ? "Searching…" : "Search"}
        </Button>
      </div>

      {toast && (
        <div
          className={`mt-4 rounded-[10px] border px-3.5 py-2.5 text-[13px] font-semibold ${
            toast.tone === "success"
              ? "border-border-accent bg-accent-50 text-primary-dark"
              : "border-danger-border bg-danger-bg text-danger-fg"
          }`}
        >
          {toast.message}
        </div>
      )}

      {lookup.isError && (
        <p className="mt-4 text-[13px] font-semibold text-danger-fg">
          {lookup.error instanceof ApiError ? lookup.error.message : "No student found with this roll number."}
        </p>
      )}

      {result && (
        <div className="mt-5 rounded-[11px] border border-border-default p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <Avatar name={result.student.name} imageUrl={result.student.photo_url} size={64} />
              <div>
                <p className="text-[17px] font-extrabold text-ink">{result.student.name}</p>
                <p className="text-[13px] text-muted">
                  {result.student.student_id_no}
                  {result.student.roll_no ? ` · Roll No. ${result.student.roll_no}` : ""}
                </p>
                {result.academics && (
                  <p className="mt-1 text-[13px] text-muted">
                    {result.academics.course} · {result.academics.department} · Section {result.academics.section}
                    {result.academics.semester ? ` · Sem ${result.academics.semester}` : ""}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <Badge tone={result.is_hosteller ? "accent" : "neutral"}>
                {result.is_hosteller ? "Hosteller" : "Day scholar"}
              </Badge>
              {result.student.status !== "active" && <Badge tone="danger">{titleCase(result.student.status)}</Badge>}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 rounded-[10px] bg-surface-tint p-3 sm:grid-cols-4">
            <Field label="Register No." value={result.student.register_no} />
            <Field label="Admission No." value={result.student.admission_no} />
            <Field label="Gender" value={result.student.gender} />
            <Field label="Date of birth" value={result.student.date_of_birth ? formatDisplayDate(result.student.date_of_birth) : null} />
            <Field label="Blood group" value={result.student.blood_group} />
            {!result.is_hosteller && (
              <Field label="Commute" value={result.student.dayscholar_mode ? titleCase(result.student.dayscholar_mode) : null} />
            )}
            <Field label="Vehicle No." value={result.student.vehicle_number} />
            <Field
              label={result.is_hosteller ? "Hostel" : "Home institution"}
              value={
                result.is_hosteller
                  ? `${result.hostel?.name ?? "—"}${result.room_number ? ` · Room ${result.room_number}` : ""}`
                  : null
              }
            />
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-[10px] bg-surface-tint p-3 text-[13px]">
              <p className="font-bold text-body">Student contact</p>
              <div className="mt-1.5 flex flex-col gap-0.5 text-muted">
                {result.student.contact && <span>Phone: {result.student.contact}</span>}
                {result.student.whatsapp && result.student.whatsapp !== result.student.contact && (
                  <span>WhatsApp: {result.student.whatsapp}</span>
                )}
                <span>{result.student.email}</span>
                {!result.student.contact && !result.student.whatsapp && <span className="text-subtle">No phone number on file</span>}
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-[10px] bg-surface-tint p-3 text-[13px]">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border-default bg-surface text-center text-[9px] leading-tight text-subtle">
                No photo
              </span>
              <div>
                <p className="font-bold text-body">
                  {result.parent
                    ? [result.parent.father_name, result.parent.mother_name].filter(Boolean).join(" / ") || "Parent / guardian"
                    : "Parent / guardian"}
                </p>
                <p className="mt-0.5 text-muted">{result.parent?.contact ?? "No contact on file"}</p>
              </div>
            </div>
          </div>

          {result.pending_outing ? (
            <div className="mt-4 rounded-[10px] border border-border-accent bg-accent-50 p-3 text-[13px] text-primary-dark">
              <p className="font-bold">Approved by Hostel Warden — cleared to leave</p>
              <p className="mt-1">
                {formatDisplayDate(result.pending_outing.from_date)} · {result.pending_outing.start_time}
                {" — "}
                {formatDisplayDate(result.pending_outing.to_date)}
                {result.pending_outing.return_time ? ` · ${result.pending_outing.return_time}` : ""}
              </p>
              {result.pending_outing.reason && <p className="mt-1">Reason: {result.pending_outing.reason}</p>}
            </div>
          ) : (
            <div className="mt-4 rounded-[10px] bg-surface-tint p-3 text-[13px] text-muted">
              No pending outing approval on file. You can still log their movement below.
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <SegmentedTabs
              options={[
                { key: "out", label: "Check-out" },
                { key: "in", label: "Check-in" },
              ]}
              value={direction}
              onChange={(key) => setDirection(key as GateEntryType)}
            />
            <Button variant="primarySmall" className="w-auto px-5" onClick={() => setConfirmOpen(true)}>
              Approve &amp; log {direction === "out" ? "exit" : "entry"}
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title={direction === "out" ? "Approve exit" : "Approve entry"}
        description={
          result
            ? `Confirm ${result.student.name} is physically here and ${direction === "out" ? "leaving" : "entering"} the campus now?`
            : undefined
        }
        confirmLabel={direction === "out" ? "Approve exit" : "Approve entry"}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
});
