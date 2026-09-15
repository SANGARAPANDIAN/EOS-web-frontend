"use client";

import { useMemo, useState } from "react";
import { Badge, DataTable, EmptyState, PillTabs, SearchBar, type BadgeTone, type DataTableColumn } from "@/components/ui";
import { useOutings, useDecideOuting, isMultiDayOuting, type Outing } from "@/modules/hostel-warden/api/outings";
import { StudentDetailModal } from "@/modules/hostel-warden/components/StudentDetailModal";
import { formatTime12h, toIsoDateString } from "@/lib/utils/date";

type Tab = "pending" | "currently_out" | "late" | "all";

function classify(o: Outing, today: string): Tab {
  if (o.status === "pending") return "pending";
  if (o.status === "approved") {
    if (o.to_date < today) return "late";
    if (o.from_date <= today && today <= o.to_date) return "currently_out";
  }
  return "all";
}

const STATUS_TONE: Record<string, BadgeTone> = {
  pending: "neutral",
  approved: "accent",
  rejected: "danger",
  late: "accentDark",
};
const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  late: "Late return",
};

export default function GatePassesPage() {
  const outings = useOutings({ page_size: 100 });
  const decide = useDecideOuting();
  const [tab, setTab] = useState<Tab>("pending");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const today = toIsoDateString(new Date());
  const rows = (outings.data?.data ?? []).filter((o) => !isMultiDayOuting(o));

  const withClass = useMemo(() => rows.map((o) => ({ ...o, _tab: classify(o, today) })), [rows, today]);

  const counts = {
    pending: withClass.filter((o) => o._tab === "pending").length,
    currently_out: withClass.filter((o) => o._tab === "currently_out").length,
    late: withClass.filter((o) => o._tab === "late").length,
    all: withClass.length,
  };

  const filtered = withClass.filter((o) => {
    if (tab !== "all" && o._tab !== tab) return false;
    if (search && !`${o.student.name} ${o.student.student_id_no} ${o.room_number ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const columns: DataTableColumn<(typeof withClass)[number]>[] = [
    {
      key: "student",
      header: "Student",
      width: "1.6fr",
      render: (row) => (
        <div>
          <button type="button" onClick={() => setSelectedId(row.student.id)} className="font-bold text-ink hover:text-primary hover:underline">
            {row.student.name}
          </button>
          <div className="font-mono text-[12px] text-subtle">{row.student.student_id_no}</div>
        </div>
      ),
    },
    { key: "room", header: "Room", width: "0.8fr", render: (row) => <span className="text-body">{row.room_number ?? "—"}</span> },
    { key: "out", header: "Out", width: "1fr", render: (row) => <span className="font-mono text-body">{formatTime12h(row.start_time)}</span> },
    {
      key: "return",
      header: "Return",
      width: "1.1fr",
      render: (row) => <span className="font-mono text-body">{row.return_time ? formatTime12h(row.return_time) : `${row.to_date}`}</span>,
    },
    { key: "reason", header: "Reason", width: "1.4fr", render: (row) => <span className="text-body">{row.reason ?? "—"}</span> },
    {
      key: "status",
      header: "Status",
      width: "1fr",
      align: "right",
      render: (row) => <Badge tone={STATUS_TONE[row._tab === "late" ? "late" : row.status]}>{STATUS_LABEL[row._tab === "late" ? "late" : row.status]}</Badge>,
    },
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

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: "pending", label: "Pending", count: counts.pending },
    { key: "currently_out", label: "Currently out", count: counts.currently_out },
    { key: "late", label: "Late returns", count: counts.late },
    { key: "all", label: "History", count: counts.all },
  ];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div>
        <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Gate passes</h1>
        <p className="mt-1 text-[13px] text-muted">Approve outings, track who is out and flag late returns.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <PillTabs
          options={TABS.map((t) => ({ key: t.key, label: `${t.label} (${t.count})` }))}
          value={tab}
          onChange={(k) => setTab(k as Tab)}
        />
        <div className="flex-1" />
        <SearchBar className="w-[280px]" placeholder="Student, register number or room" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {outings.isLoading ? (
        <EmptyState message="Loading…" />
      ) : (
        <DataTable columns={columns} data={filtered} rowKey={(row) => row.id} emptyMessage="Nothing in this view." hoverableRows />
      )}

      {selectedId != null && <StudentDetailModal studentId={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  );
}
