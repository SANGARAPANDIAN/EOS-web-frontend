"use client";

import { Card, Badge, EmptyState } from "@/components/ui";
import { useSelectedChild } from "@/modules/parent/ChildContext";
import { ChildSwitcher } from "@/modules/parent/components/ChildSwitcher";
import { useChildLeaves } from "@/modules/parent/api/leave";
import type { LeaveRow, LeaveStatus } from "@/modules/parent/api/leave";
import { formatDisplayDate } from "@/lib/utils/date";

const STATUS_LABEL: Record<LeaveStatus, string> = {
  pending: "Pending",
  faculty_approved: "Faculty approved",
  hod_approved: "HOD approved",
  rejected: "Rejected",
  warden_approved: "Warden approved",
};

function durationLabel(from: string, to: string): string {
  const days = Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86_400_000) + 1;
  return `${days} day${days === 1 ? "" : "s"}`;
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

export default function ParentLeavePage() {
  const { selectedChildId } = useSelectedChild();
  const leaves = useChildLeaves(selectedChildId);

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">Leave</h1>
          <p className="mt-1 text-[13.5px] text-muted">Routed through the class advisor, then the HoD</p>
        </div>
        <ChildSwitcher />
      </div>

      {leaves.isLoading ? (
        <Card>
          <EmptyState message="Loading…" />
        </Card>
      ) : (
        <LeaveHistoryTable rows={leaves.data?.data ?? []} />
      )}
    </div>
  );
}
