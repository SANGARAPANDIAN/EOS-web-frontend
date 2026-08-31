"use client";

import { useState } from "react";
import { Card, Badge, SegmentedTabs, Button, Input, Textarea, Banner, EmptyState } from "@/components/ui";
import { useMyLeaves, useCreateLeave, type LeaveRow, type LeaveStatus } from "@/modules/student/api/leave";
import { useMyAcademicProfile } from "@/modules/student/api/profile";
import { formatDisplayDate } from "@/lib/utils/date";
import { ApiError } from "@/types/api";

type Tab = "apply" | "history";

const REASON_MAX_LENGTH = 255;

const STATUS_LABEL: Record<LeaveStatus, string> = {
  pending: "Pending",
  faculty_approved: "Faculty approved",
  hod_approved: "HOD approved",
  rejected: "Rejected",
  // Never actually produced on this page's own (routed_to_warden: false)
  // leaves — only present so LeaveStatus's full union always has a label,
  // since this type is shared with the Hostel tab's Leave section.
  warden_approved: "Warden approved",
};

function durationLabel(from: string, to: string): string {
  const days = Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86_400_000) + 1;
  return `${days} day${days === 1 ? "" : "s"}`;
}

export default function LeavePage() {
  const [tab, setTab] = useState<Tab>("apply");
  // routed_to_warden: false — this page is the academic Student -> Faculty
  // -> HoD chain only; a Hostel-tab leave (routed_to_warden: true) has its
  // own history in the Hostel page's Leave section, not here.
  const leaves = useMyLeaves(false);
  const createLeave = useCreateLeave();
  // Mess charges/warden notification only apply to an actual resident —
  // day scholars never see the option, so hostelLeave stays false for them.
  const academicProfile = useMyAcademicProfile();
  const isHosteller = academicProfile.data?.student_type === "hosteller";

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reason, setReason] = useState("");
  const [hostelLeave, setHostelLeave] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const hasValidRange = Boolean(fromDate && toDate && toDate >= fromDate);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createLeave.mutateAsync({
        from_date: fromDate,
        to_date: toDate,
        reason: reason || undefined,
        also_on_hostel_leave: hostelLeave,
      });
      setSuccess(true);
      setFromDate("");
      setToDate("");
      setReason("");
      setHostelLeave(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">Leave</h1>
          <p className="mt-1 text-[13.5px] text-muted">Requests are routed to your class advisor, then the HoD</p>
        </div>
        <SegmentedTabs
          options={[
            { key: "apply", label: "Apply" },
            { key: "history", label: "History" },
          ]}
          value={tab}
          onChange={(k) => setTab(k as Tab)}
        />
      </div>

      {tab === "apply" ? (
        <Card className="p-[22px_24px]">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11.5px] font-bold text-muted">From date</label>
                <Input type="date" required value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11.5px] font-bold text-muted">To date</label>
                <Input type="date" required value={toDate} min={fromDate || undefined} onChange={(e) => setToDate(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11.5px] font-bold text-muted">Duration</label>
                <div className="rounded-input border border-border-default bg-surface-muted px-[13px] py-[11px] text-sm font-bold text-body">
                  {hasValidRange ? durationLabel(fromDate, toDate) : "Select both dates"}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11.5px] font-bold text-muted">
                Reason ({reason.length}/{REASON_MAX_LENGTH})
              </label>
              <Textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value.slice(0, REASON_MAX_LENGTH))}
                placeholder="Describe the reason for leave"
              />
            </div>

            {isHosteller && (
              <label className="flex items-start gap-3 rounded-[11px] border border-border-default bg-surface-muted p-3.5">
                <input
                  type="checkbox"
                  checked={hostelLeave}
                  onChange={(e) => setHostelLeave(e.target.checked)}
                  className="mt-0.5 size-[17px] shrink-0 accent-primary"
                />
                <span>
                  <span className="block text-[13.5px] font-bold text-ink">Also on hostel leave</span>
                  <span className="mt-0.5 block text-[12px] leading-[1.5] text-muted">
                    Tick if you are going home — the warden and the mess are informed and your mess charges are paused for those days.
                  </span>
                </span>
              </label>
            )}

            {error && (
              <div className="rounded-[10px] border border-danger-border bg-danger-bg px-3.5 py-2.5 text-[13px] font-semibold text-danger-fg">
                {error}
              </div>
            )}
            {success && <Banner>Your leave request has been submitted.</Banner>}

            <Button type="submit" disabled={!fromDate || !toDate || createLeave.isPending}>
              {createLeave.isPending ? "Submitting…" : "Submit request"}
            </Button>
          </form>
        </Card>
      ) : leaves.isLoading ? (
        <Card>
          <EmptyState message="Loading…" />
        </Card>
      ) : (
        <LeaveHistoryTable rows={leaves.data?.data ?? []} />
      )}
    </div>
  );
}

function LeaveHistoryTable({ rows }: { rows: LeaveRow[] }) {
  if (rows.length === 0) {
    return (
      <Card>
        <EmptyState message="No leave requests yet." />
      </Card>
    );
  }

  const gridCols = "1fr 0.9fr 1fr 1.6fr 1.2fr 1fr";

  return (
    <Card className="overflow-hidden p-0">
      <div className="grid gap-2 bg-surface-muted px-5 py-3 text-[10.5px] font-extrabold tracking-[.09em] text-subtle" style={{ gridTemplateColumns: gridCols }}>
        <div>FROM</div>
        <div>DURATION</div>
        <div>TO</div>
        <div>REASON</div>
        <div>APPROVER</div>
        <div className="text-right">STATUS</div>
      </div>
      {rows.map((r) => (
        <div key={r.id} className="grid items-center gap-2 border-t border-divider px-5 py-3.5" style={{ gridTemplateColumns: gridCols }}>
          <div className="text-[13.5px] font-bold text-ink">{formatDisplayDate(r.from_date)}</div>
          <div className="text-[13px] text-muted">{durationLabel(r.from_date, r.to_date)}</div>
          <div className="text-[13.5px] font-bold text-ink">{formatDisplayDate(r.to_date)}</div>
          <div className="text-[13px] text-body">{r.reason ?? "—"}</div>
          <div className="text-[13px] text-body">{r.approved_by_hod ?? r.approved_by_faculty ?? "—"}</div>
          <div className="text-right">
            <Badge tone={r.status === "rejected" ? "accentDark" : "accent"}>{STATUS_LABEL[r.status]}</Badge>
          </div>
        </div>
      ))}
    </Card>
  );
}
