"use client";

import { Card, Badge, EmptyState } from "@/components/ui";
import { useSelectedChild } from "@/modules/parent/ChildContext";
import { ChildSwitcher } from "@/modules/parent/components/ChildSwitcher";
import { useChildBonafideRequests } from "@/modules/parent/api/bonafide";
import type { BonafideRequestRow, BonafideStatus } from "@/modules/parent/api/bonafide";
import { formatDisplayDate } from "@/lib/utils/date";

const STATUS_LABEL: Record<BonafideStatus, string> = {
  pending: "Pending",
  faculty_approved: "Accepted",
  issued: "Ready — collect from office",
  rejected: "Rejected",
};

const STATUS_TONE: Record<BonafideStatus, "neutral" | "accent" | "accentDark" | "danger"> = {
  pending: "neutral",
  faculty_approved: "accent",
  issued: "accentDark",
  rejected: "danger",
};

function BonafideHistoryTable({ rows }: { rows: BonafideRequestRow[] }) {
  if (rows.length === 0) {
    return (
      <Card>
        <EmptyState message="No bonafide requests yet." />
      </Card>
    );
  }

  const gridCols = "1fr 2fr 1.2fr 1fr";

  return (
    <Card className="overflow-hidden p-0">
      <div className="grid gap-2 bg-surface-muted px-5 py-3 text-[10.5px] font-extrabold tracking-[.09em] text-subtle" style={{ gridTemplateColumns: gridCols }}>
        <div>REQUEST ID</div>
        <div>PURPOSE</div>
        <div>APPLIED</div>
        <div className="text-right">STATUS</div>
      </div>
      {rows.map((r) => (
        <div key={r.id} className="grid items-center gap-2 border-t border-divider px-5 py-3.5" style={{ gridTemplateColumns: gridCols }}>
          <div className="font-mono text-[12.5px] font-bold text-ink">BF-{r.id}</div>
          <div className="text-[13.5px] font-bold text-ink">{r.reason_text}</div>
          <div className="text-[13px] text-muted">{formatDisplayDate(r.requested_at)}</div>
          <div className="text-right">
            <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>
          </div>
        </div>
      ))}
    </Card>
  );
}

export default function ParentBonafidePage() {
  const { selectedChildId } = useSelectedChild();
  const requests = useChildBonafideRequests(selectedChildId);

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">Bonafide certificate</h1>
          <p className="mt-1 text-[13.5px] text-muted">Issued by the office within two working days</p>
        </div>
        <ChildSwitcher />
      </div>

      {requests.isLoading ? (
        <Card>
          <EmptyState message="Loading…" />
        </Card>
      ) : (
        <BonafideHistoryTable rows={requests.data?.data ?? []} />
      )}
    </div>
  );
}
