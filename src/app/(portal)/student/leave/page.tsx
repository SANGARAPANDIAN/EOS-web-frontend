"use client";

import { useState } from "react";
import { Card, Badge, SegmentedTabs, Button, Input, Textarea, Banner, EmptyState } from "@/components/ui";
import { useMyLeaves, useCreateLeave, type LeaveRow, type LeaveStatus } from "@/modules/student/api/leave";
import { formatDisplayDate } from "@/lib/utils/date";
import { ApiError } from "@/types/api";

type Tab = "apply" | "history";

const REASON_MAX_LENGTH = 255;

const STATUS_LABEL: Record<LeaveStatus, string> = {
  pending: "Pending",
  faculty_approved: "Faculty approved",
  hod_approved: "HOD approved",
  rejected: "Rejected",
};

function durationLabel(from: string, to: string): string {
  const days = Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86_400_000) + 1;
  return `${days} day${days === 1 ? "" : "s"}`;
}

export default function LeavePage() {
  const [tab, setTab] = useState<Tab>("apply");
  const leaves = useMyLeaves();
  const createLeave = useCreateLeave();

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createLeave.mutateAsync({ from_date: fromDate, to_date: toDate, reason: reason || undefined });
      setSuccess(true);
      setFromDate("");
      setToDate("");
      setReason("");
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
        <Card className="max-w-[620px] p-[22px_24px]">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11.5px] font-bold text-muted">From date</label>
                <Input type="date" required value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11.5px] font-bold text-muted">To date</label>
                <Input type="date" required value={toDate} min={fromDate || undefined} onChange={(e) => setToDate(e.target.value)} />
              </div>
            </div>
            {fromDate && toDate && toDate >= fromDate && (
              <div className="-mt-2 text-[12px] font-semibold text-primary">{durationLabel(fromDate, toDate)}</div>
            )}
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

  const gridCols = "1.1fr 1fr 1.1fr 1.4fr 1fr";

  return (
    <Card className="overflow-hidden p-0">
      <div className="grid gap-2 bg-surface-muted px-5 py-3 text-[10.5px] font-extrabold tracking-[.09em] text-subtle" style={{ gridTemplateColumns: gridCols }}>
        <div>FROM</div>
        <div>DURATION</div>
        <div>TO</div>
        <div>APPROVER</div>
        <div className="text-right">STATUS</div>
      </div>
      {rows.map((r) => (
        <div key={r.id} className="grid items-center gap-2 border-t border-divider px-5 py-3.5" style={{ gridTemplateColumns: gridCols }}>
          <div className="text-[13.5px] font-bold text-ink">{formatDisplayDate(r.from_date)}</div>
          <div className="text-[13px] text-muted">{durationLabel(r.from_date, r.to_date)}</div>
          <div className="text-[13.5px] font-bold text-ink">{formatDisplayDate(r.to_date)}</div>
          <div className="text-[13px] text-body">{r.approved_by_hod ?? r.approved_by_faculty ?? "—"}</div>
          <div className="text-right">
            <Badge tone={r.status === "rejected" ? "accentDark" : "accent"}>{STATUS_LABEL[r.status]}</Badge>
          </div>
        </div>
      ))}
    </Card>
  );
}
