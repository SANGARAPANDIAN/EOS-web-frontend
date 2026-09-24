"use client";

import { Card, Badge, EmptyState, DataTable } from "@/components/ui";
import type { DataTableColumn } from "@/components/ui/DataTable";
import { useSelectedChild } from "@/modules/parent/ChildContext";
import { ChildSwitcher } from "@/modules/parent/components/ChildSwitcher";
import { useChildClearanceRequests } from "@/modules/parent/api/noDue";
import type { ClearanceRequest, ClearanceType } from "@/modules/parent/api/noDue";
import { formatDisplayDate } from "@/lib/utils/date";

const CLEARANCE_TYPE_LABEL: Record<ClearanceType, string> = {
  fee_due: "Fee due exception",
  no_due: "General no-due",
  library_due: "Library due exception",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  expired: "Expired",
};

export default function ParentNoDuePage() {
  const { selectedChildId } = useSelectedChild();
  const requests = useChildClearanceRequests(selectedChildId);

  const columns: DataTableColumn<ClearanceRequest>[] = [
    { key: "exam", header: "Exam", width: "1.8fr", render: (r) => `${r.exam.type} · ${r.exam.academic_year} Sem ${r.exam.semester}` },
    { key: "type", header: "Type", width: "1.3fr", render: (r) => <Badge tone="accent">{CLEARANCE_TYPE_LABEL[r.clearance_type]}</Badge> },
    { key: "applied", header: "Applied", width: "1fr", render: (r) => formatDisplayDate(r.requested_at) },
    {
      key: "status",
      header: "Status",
      width: "1fr",
      render: (r) => <Badge tone={r.effective_status === "rejected" ? "accentDark" : "accent"}>{STATUS_LABEL[r.effective_status]}</Badge>,
    },
  ];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">No due / hall-ticket clearance</h1>
        <ChildSwitcher />
      </div>

      {requests.isLoading ? (
        <Card>
          <EmptyState message="Loading…" />
        </Card>
      ) : (
        <DataTable
          columns={columns}
          data={requests.data?.data ?? []}
          rowKey={(r) => r.id}
          emptyMessage="No clearance requests yet."
        />
      )}
    </div>
  );
}
