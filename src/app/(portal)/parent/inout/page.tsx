"use client";

import { Card, Badge, DataTable, EmptyState } from "@/components/ui";
import type { DataTableColumn } from "@/components/ui/DataTable";
import { useSelectedChild } from "@/modules/parent/ChildContext";
import { ChildSwitcher } from "@/modules/parent/components/ChildSwitcher";
import { useChildCampusOutings } from "@/modules/parent/api/campusOutings";
import type { CampusOuting } from "@/modules/parent/api/campusOutings";
import { formatDisplayDate, formatTime12h } from "@/lib/utils/date";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  faculty_approved: "Faculty approved",
  hod_approved: "HOD approved",
  rejected: "Rejected",
  warden_approved: "Approved",
};

export default function ParentInOutPage() {
  const { selectedChildId } = useSelectedChild();
  const outings = useChildCampusOutings(selectedChildId);

  const columns: DataTableColumn<CampusOuting>[] = [
    { key: "from", header: "From", width: "1fr", render: (r) => formatDisplayDate(r.from_date) },
    { key: "out", header: "Out", width: "0.8fr", render: (r) => formatTime12h(r.start_time) },
    { key: "to", header: "To", width: "1fr", render: (r) => formatDisplayDate(r.to_date) },
    { key: "in", header: "In", width: "0.8fr", render: (r) => (r.return_time ? formatTime12h(r.return_time) : "—") },
    { key: "reason", header: "Reason", width: "1.5fr", render: (r) => r.reason ?? "—" },
    { key: "approver", header: "Approved by", width: "1.3fr", render: (r) => r.approved_by_hod ?? r.approved_by_faculty ?? "—" },
    {
      key: "status",
      header: "Status",
      width: "1fr",
      render: (r) => <Badge tone={r.status === "rejected" ? "accentDark" : "accent"}>{STATUS_LABEL[r.status]}</Badge>,
    },
  ];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">In / out request</h1>
          <p className="mt-1 text-[13.5px] text-muted">Routed through the class advisor, then the HoD</p>
        </div>
        <ChildSwitcher />
      </div>

      {outings.isLoading ? (
        <Card>
          <EmptyState message="Loading…" />
        </Card>
      ) : (
        <DataTable columns={columns} data={outings.data?.data ?? []} rowKey={(r) => r.id} emptyMessage="No outing requests yet." />
      )}
    </div>
  );
}
