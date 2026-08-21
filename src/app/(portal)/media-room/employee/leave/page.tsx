"use client";

import { useState } from "react";
import { Card, Badge, Button, Input, Select, Textarea, EmptyState, SkeletonRows } from "@/components/ui";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import {
  useMediaRoomLeaveTypes,
  useMediaRoomLeaveBalances,
  useMediaRoomLeaveHistory,
  useApplyMediaRoomLeave,
} from "@/modules/media-room/api/employeeLeave";
import { formatDisplayDate } from "@/lib/utils/date";

function statusTone(status: string): "accent" | "danger" | "neutral" {
  if (status === "approved") return "accent";
  if (status === "rejected") return "danger";
  return "neutral";
}

function daysBetween(from: string, to: string): number {
  return Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000) + 1;
}

export default function MediaRoomEmployeeLeavePage() {
  const [tab, setTab] = useState<"apply" | "history">("apply");

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Staff Leave</h1>
          <p className="mt-1 text-[13px] text-muted">Requests are routed to HR, then the Principal&apos;s office</p>
        </div>
        <SegmentedTabs
          value={tab}
          onChange={(k) => setTab(k as "apply" | "history")}
          options={[
            { key: "apply", label: "Apply" },
            { key: "history", label: "History" },
          ]}
        />
      </div>

      <BalanceTiles />

      {tab === "apply" ? <ApplyForm /> : <HistoryList />}
    </div>
  );
}

function BalanceTiles() {
  const balances = useMediaRoomLeaveBalances();
  if (!balances.data || balances.data.length === 0) {
    return (
      <Card data-mr-lift="1">
        <EmptyState loading={balances.isLoading} size={32} message="No leave balances recorded for this academic year." />
      </Card>
    );
  }
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${balances.data.length}, 1fr)` }}>
      {balances.data.map((b) => (
        <Card data-mr-lift="1" key={b.leave_type_id}>
          <div className="text-[13px] font-bold text-body">{b.leave_type}</div>
          <div className="mt-1.5 text-[28px] font-extrabold text-ink">{b.remaining}</div>
          <div className="text-[12px] text-muted">of {b.allocated} remaining</div>
        </Card>
      ))}
    </div>
  );
}

function ApplyForm() {
  const leaveTypes = useMediaRoomLeaveTypes();
  const history = useMediaRoomLeaveHistory();
  const apply = useApplyMediaRoomLeave();

  const [leaveTypeId, setLeaveTypeId] = useState<number | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reason, setReason] = useState("");
  const [alternateArrangement, setAlternateArrangement] = useState("");
  const [stationLeave, setStationLeave] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const notReady = history.data && !history.data.ready;
  const effectiveLeaveTypeId = leaveTypeId ?? leaveTypes.data?.[0]?.id ?? null;
  const duration = fromDate && toDate ? `${daysBetween(fromDate, toDate)} day${daysBetween(fromDate, toDate) === 1 ? "" : "s"}` : null;

  async function submit() {
    if (!fromDate || !toDate) return;
    setError(null);
    try {
      await apply.mutateAsync({
        from_date: fromDate,
        to_date: toDate,
        reason: reason || undefined,
        leave_type_id: effectiveLeaveTypeId ?? undefined,
        alternate_arrangement: alternateArrangement || undefined,
        is_station_leave: stationLeave,
      });
      setSubmitted(true);
      setFromDate("");
      setToDate("");
      setReason("");
      setAlternateArrangement("");
      setStationLeave(false);
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Could not submit this request.");
    }
  }

  return (
    <Card data-mr-lift="1">
      {submitted && (
        <div className="mb-4 rounded-[10px] bg-accent-50 px-4 py-3 text-[13px] font-bold text-primary">Leave request submitted.</div>
      )}
      <div className="grid grid-cols-2 gap-5">
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Leave Type</label>
          <Select value={effectiveLeaveTypeId ?? ""} onChange={(e) => setLeaveTypeId(Number(e.target.value))}>
            {(leaveTypes.data ?? []).map((lt) => (
              <option key={lt.id} value={lt.id}>
                {lt.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Duration</label>
          <div className="flex h-[45px] items-center rounded-input border border-border-default bg-surface-tint px-[13px] text-[14px] text-subtle">
            {duration ?? "Select both dates"}
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">From Date</label>
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">To Date</label>
          <Input type="date" value={toDate} min={fromDate || undefined} onChange={(e) => setToDate(e.target.value)} />
        </div>
      </div>

      <div className="mt-5">
        <label className="mb-1.5 block text-[13px] font-bold text-ink">Reason ({reason.length}/200)</label>
        <Textarea rows={4} maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Describe the reason for your leave" />
      </div>

      <div className="mt-5">
        <label className="mb-1.5 block text-[13px] font-bold text-ink">Alternate Arrangement</label>
        <Input
          value={alternateArrangement}
          onChange={(e) => setAlternateArrangement(e.target.value)}
          placeholder="e.g. Sneha B. will cover the publishing queue"
        />
      </div>

      <label className="mt-5 flex items-start gap-3 rounded-[10px] bg-surface-tint p-4">
        <input type="checkbox" checked={stationLeave} onChange={(e) => setStationLeave(e.target.checked)} className="mt-0.5 size-4" />
        <span>
          <span className="block text-[13.5px] font-bold text-ink">Station leave</span>
          <span className="block text-[12px] text-muted">Tick if you are leaving the station during these days — HR and the office are notified.</span>
        </span>
      </label>

      <button
        type="button"
        disabled
        title="Attachment upload isn't wired up yet"
        className="mt-5 w-full rounded-[10px] border border-dashed border-border-default py-3 text-center text-[13.5px] font-bold text-primary opacity-60"
      >
        Attach medical certificate (optional)
      </button>

      {error && <div className="mt-4 text-[13px] font-semibold text-danger-fg">{error}</div>}
      <Button variant="primary" className="mt-6" onClick={submit} disabled={!fromDate || !toDate || apply.isPending || !!notReady}>
        {apply.isPending ? "Submitting…" : "Submit Leave Request"}
      </Button>
    </Card>
  );
}

function HistoryList() {
  const [status, setStatus] = useState<"pending" | "approved" | "rejected" | undefined>(undefined);
  const history = useMediaRoomLeaveHistory(status);

  return (
    <div className="flex flex-col gap-4">
      <SegmentedTabs
        value={status ?? "all"}
        onChange={(k) => setStatus(k === "all" ? undefined : (k as "pending" | "approved" | "rejected"))}
        options={[
          { key: "all", label: "All" },
          { key: "pending", label: "Pending" },
          { key: "approved", label: "Approved" },
          { key: "rejected", label: "Rejected" },
        ]}
      />
      {history.data && !history.data.ready ? (
        <Card data-mr-lift="1">
          <EmptyState message="Leave requests aren't set up yet — ask an admin to run the pending database migration." />
        </Card>
      ) : history.isLoading ? (
        <SkeletonRows count={4} />
      ) : !history.data || history.data.data.length === 0 ? (
        <Card data-mr-lift="1">
          <EmptyState message="No leave requests yet." />
        </Card>
      ) : (
        history.data.data.map((h) => (
          <Card data-mr-lift="1" key={h.id}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[14px] font-bold text-ink">{h.leave_type?.name ?? "Leave"}</div>
                <div className="mt-0.5 text-[12.5px] text-muted">
                  {formatDisplayDate(h.from_date)} – {formatDisplayDate(h.to_date)} · applied {formatDisplayDate(h.created_at)}
                </div>
              </div>
              <Badge tone={statusTone(h.overall_status)}>{h.overall_status.toUpperCase()}</Badge>
            </div>
            {h.reason && <p className="mt-2 text-[13px] text-body">{h.reason}</p>}
          </Card>
        ))
      )}
    </div>
  );
}
