"use client";

import { useState } from "react";
import { Badge, DataTable, EmptyState, SearchBar, type BadgeTone, type DataTableColumn } from "@/components/ui";
import { useResidents, type Resident } from "@/modules/hostel-warden/api/residents";
import { StudentDetailModal } from "@/modules/hostel-warden/components/StudentDetailModal";

const STATUS_TONE: Record<Resident["current_status"], BadgeTone> = { in_hostel: "accent", on_leave: "accentDark" };
const STATUS_LABEL: Record<Resident["current_status"], string> = { in_hostel: "Inside", on_leave: "Out on leave" };
const FEE_TONE: Record<Resident["fee_status"], BadgeTone> = { paid: "accent", partially_paid: "accentDark", unpaid: "danger", not_applicable: "neutral" };
const FEE_LABEL: Record<Resident["fee_status"], string> = { paid: "Paid", partially_paid: "Partly paid", unpaid: "Due", not_applicable: "—" };

export default function ResidentsPage() {
  const [search, setSearch] = useState("");
  const residents = useResidents({ q: search || undefined, page_size: 100 });
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const rows = residents.data?.data ?? [];

  const columns: DataTableColumn<Resident>[] = [
    {
      key: "name",
      header: "Name",
      width: "1.5fr",
      render: (row) => (
        <button type="button" onClick={() => setSelectedId(row.id)} className="font-bold text-ink hover:text-primary hover:underline">
          {row.name}
        </button>
      ),
    },
    { key: "reg", header: "Register no.", width: "1fr", render: (row) => <span className="font-mono text-body">{row.student_id_no}</span> },
    { key: "room", header: "Room", width: "0.7fr", render: (row) => <span className="text-body">{row.room?.room_number ?? "—"}</span> },
    { key: "course", header: "Course", width: "1.4fr", render: (row) => <span className="text-body">{row.course}</span> },
    {
      key: "guardian",
      header: "Parent contact",
      width: "1.3fr",
      render: (row) => (
        <div>
          <div className="text-[13.5px] text-body">{row.guardian_name ?? "—"}</div>
          <div className="font-mono text-[12px] text-subtle">{row.guardian_phone ?? ""}</div>
        </div>
      ),
    },
    { key: "fee", header: "Fee", width: "0.9fr", render: (row) => <Badge tone={FEE_TONE[row.fee_status]}>{FEE_LABEL[row.fee_status]}</Badge> },
    { key: "status", header: "Status", width: "1fr", align: "right", render: (row) => <Badge tone={STATUS_TONE[row.current_status]}>{STATUS_LABEL[row.current_status]}</Badge> },
  ];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div>
        <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Students</h1>
        <p className="mt-1 text-[13px] text-muted">
          Hostel residents · tap a name for the full profile · {rows.length} shown.
        </p>
      </div>

      <SearchBar className="max-w-[380px]" placeholder="Name, register number or room" value={search} onChange={(e) => setSearch(e.target.value)} />

      {residents.isLoading ? (
        <EmptyState message="Loading…" />
      ) : (
        <DataTable columns={columns} data={rows} rowKey={(row) => row.id} emptyMessage="No student matches that search." hoverableRows />
      )}

      {selectedId != null && <StudentDetailModal studentId={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  );
}
