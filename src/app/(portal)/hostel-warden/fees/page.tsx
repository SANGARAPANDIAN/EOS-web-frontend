"use client";

import { useState } from "react";
import { Badge, DataTable, EmptyState, type BadgeTone, type DataTableColumn } from "@/components/ui";
import { useHostelFees, type HostelFeeRow, type HostelFeeStatus } from "@/modules/hostel-warden/api/fees";
import { StudentDetailModal } from "@/modules/hostel-warden/components/StudentDetailModal";

type FilterKey = "all" | HostelFeeStatus;

const STATUS_TONE: Record<HostelFeeStatus, BadgeTone> = { paid: "accent", partially_paid: "accentDark", unpaid: "danger" };
const STATUS_LABEL: Record<HostelFeeStatus, string> = { paid: "Paid", partially_paid: "Part paid", unpaid: "Overdue" };

export default function HostelFeesPage() {
  const fees = useHostelFees({ page_size: 100 });
  const [filter, setFilter] = useState<FilterKey>("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const rows = fees.data?.data ?? [];
  const counts = {
    all: rows.length,
    unpaid: rows.filter((r) => r.status === "unpaid").length,
    partially_paid: rows.filter((r) => r.status === "partially_paid").length,
    paid: rows.filter((r) => r.status === "paid").length,
  };

  const filtered = filter === "all" ? rows : rows.filter((r) => r.status === filter);

  const columns: DataTableColumn<HostelFeeRow>[] = [
    {
      key: "name",
      header: "Student",
      width: "1.6fr",
      render: (row) => (
        <button type="button" onClick={() => setSelectedId(row.student_id)} className="font-bold text-ink hover:text-primary hover:underline">
          {row.name}
        </button>
      ),
    },
    { key: "reg", header: "Register no.", width: "1fr", render: (row) => <span className="font-mono text-body">{row.student_id_no}</span> },
    { key: "room", header: "Room", width: "0.8fr", render: (row) => <span className="text-body">{row.room_number ?? "—"}</span> },
    { key: "sharing", header: "Sharing", width: "1.1fr", render: (row) => <span className="text-body">{row.sharing ?? "—"}</span> },
    { key: "status", header: "Status", width: "1fr", align: "right", render: (row) => <Badge tone={STATUS_TONE[row.status]}>{STATUS_LABEL[row.status]}</Badge> },
  ];

  const TABS: { key: FilterKey; label: string; count: number }[] = [
    { key: "all", label: "All", count: counts.all },
    { key: "unpaid", label: "Overdue", count: counts.unpaid },
    { key: "partially_paid", label: "Part paid", count: counts.partially_paid },
    { key: "paid", label: "Paid", count: counts.paid },
  ];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div>
        <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Fees &amp; dues</h1>
        <p className="mt-1 text-[13px] text-muted">Payment status per resident.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setFilter(t.key)}
            className={`rounded-pill border px-4 py-2 text-[13px] font-bold transition-colors ${
              filter === t.key ? "border-primary bg-primary text-white" : "border-border-default bg-surface text-ink-soft hover:bg-surface-tint"
            }`}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {fees.isLoading ? (
        <EmptyState message="Loading…" />
      ) : (
        <DataTable columns={columns} data={filtered} rowKey={(row) => row.student_id} emptyMessage="No fee records in this view." hoverableRows />
      )}

      {selectedId != null && <StudentDetailModal studentId={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  );
}
