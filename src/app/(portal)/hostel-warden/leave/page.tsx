"use client";

import { useState } from "react";
import { Badge, DataTable, EmptyState, SearchBar, type BadgeTone, type DataTableColumn } from "@/components/ui";
import { useOutings, useDecideOuting, isMultiDayOuting, type Outing, type OutingStatus } from "@/modules/hostel-warden/api/outings";
import { StudentDetailModal } from "@/modules/hostel-warden/components/StudentDetailModal";
import { formatDisplayDate } from "@/lib/utils/date";

type FilterKey = "all" | OutingStatus;

const STATUS_TONE: Record<OutingStatus, BadgeTone> = { pending: "neutral", approved: "accent", rejected: "danger" };
const STATUS_LABEL: Record<OutingStatus, string> = { pending: "Pending", approved: "Approved", rejected: "Rejected" };

function durationDays(o: Outing): number {
  const from = new Date(o.from_date).getTime();
  const to = new Date(o.to_date).getTime();
  return Math.round((to - from) / 86_400_000) + 1;
}

export default function LeaveRequestsPage() {
  const outings = useOutings({ page_size: 100 });
  const decide = useDecideOuting();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const rows = (outings.data?.data ?? []).filter(isMultiDayOuting);
  const counts = {
    all: rows.length,
    pending: rows.filter((o) => o.status === "pending").length,
    approved: rows.filter((o) => o.status === "approved").length,
    rejected: rows.filter((o) => o.status === "rejected").length,
  };

  const filtered = rows.filter((o) => {
    if (filter !== "all" && o.status !== filter) return false;
    if (search && !`${o.student.name} ${o.student.student_id_no} ${o.room_number ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const columns: DataTableColumn<Outing>[] = [
    {
      key: "student",
      header: "Student",
      width: "1.6fr",
      render: (row) => (
        <div>
          <button type="button" onClick={() => setSelectedId(row.student.id)} className="font-bold text-ink hover:text-primary hover:underline">
            {row.student.name}
          </button>
          <div className="text-[12px] text-subtle">{row.room_number ?? "—"}</div>
        </div>
      ),
    },
    { key: "duration", header: "Duration", width: "0.9fr", render: (row) => <span className="font-mono text-body">{durationDays(row)} days</span> },
    {
      key: "dates",
      header: "Dates",
      width: "1.6fr",
      render: (row) => (
        <span className="font-mono text-[12.5px] text-body">
          {formatDisplayDate(row.from_date)} – {formatDisplayDate(row.to_date)}
        </span>
      ),
    },
    { key: "reason", header: "Reason", width: "1.6fr", render: (row) => <span className="text-body">{row.reason ?? "—"}</span> },
    { key: "status", header: "Status", width: "1fr", align: "right", render: (row) => <Badge tone={STATUS_TONE[row.status]}>{STATUS_LABEL[row.status]}</Badge> },
    {
      key: "action",
      header: "",
      width: "1.3fr",
      align: "right",
      render: (row) =>
        row.status === "pending" ? (
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => decide.mutate({ id: row.id, decision: "rejected" })}
              disabled={decide.isPending}
              className="rounded-[7px] border border-border-default px-2.5 py-1.5 text-[12.5px] font-bold text-body hover:bg-surface-tint"
            >
              Reject
            </button>
            <button
              type="button"
              onClick={() => decide.mutate({ id: row.id, decision: "approved" })}
              disabled={decide.isPending}
              className="rounded-[7px] bg-primary px-2.5 py-1.5 text-[12.5px] font-bold text-white hover:bg-primary-dark"
            >
              Approve
            </button>
          </div>
        ) : null,
    },
  ];

  const TABS: { key: FilterKey; label: string; count: number }[] = [
    { key: "all", label: "All", count: counts.all },
    { key: "pending", label: "Pending", count: counts.pending },
    { key: "approved", label: "Approved", count: counts.approved },
    { key: "rejected", label: "Rejected", count: counts.rejected },
  ];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div>
        <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Leave requests</h1>
        <p className="mt-1 text-[13px] text-muted">Multi-day home visits and leave requests.</p>
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
        <div className="flex-1" />
        <SearchBar className="w-[280px]" placeholder="Student, register number or room" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {outings.isLoading ? (
        <EmptyState message="Loading…" />
      ) : (
        <DataTable columns={columns} data={filtered} rowKey={(row) => row.id} emptyMessage="No leave requests in this view." hoverableRows />
      )}

      {selectedId != null && <StudentDetailModal studentId={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  );
}
