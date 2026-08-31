"use client";

import { useMemo, useState } from "react";
import { Badge, DataTable, EmptyState, PillTabs, SearchBar, type BadgeTone, type DataTableColumn } from "@/components/ui";
import { useOutings, useDecideOuting, isMultiDayOuting, type Outing } from "@/modules/hostel-warden/api/outings";
import {
  useHostelLeaveRequests,
  useDecideHostelLeaveRequest,
  useAcademicHostelLeaves,
  type HostelLeaveRequest,
  type AcademicLeaveStatus,
} from "@/modules/hostel-warden/api/leaveRequests";
import { StudentDetailModal } from "@/modules/hostel-warden/components/StudentDetailModal";
import { formatDisplayDate } from "@/lib/utils/date";

type FilterKey = "all" | "pending" | "approved" | "rejected";
type Kind = "outing" | "hostel_leave";

const STATUS_TONE: Record<FilterKey, BadgeTone> = { all: "neutral", pending: "neutral", approved: "accent", rejected: "danger" };
const STATUS_LABEL: Record<FilterKey, string> = { all: "All", pending: "Pending", approved: "Approved", rejected: "Rejected" };
const KIND_LABEL: Record<Kind, string> = { outing: "Outing", hostel_leave: "Hostel leave" };

/** approved (outing) and warden_approved (hostel leave) both read as "Approved" here — same decision, different enum literal per source table. */
function normalizeStatus(raw: string): "pending" | "approved" | "rejected" {
  if (raw === "rejected") return "rejected";
  if (raw === "pending") return "pending";
  return "approved";
}

interface CombinedRow {
  key: string;
  kind: Kind;
  id: number;
  student: { id: number; name: string; student_id_no: string; roll_no: string | null };
  room_number: string | null;
  from_date: string;
  to_date: string;
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

function durationDays(from: string, to: string): number {
  return Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86_400_000) + 1;
}

const ACADEMIC_STATUS_TONE: Record<AcademicLeaveStatus, BadgeTone> = {
  pending: "neutral",
  faculty_approved: "neutral",
  hod_approved: "accent",
  rejected: "danger",
};
const ACADEMIC_STATUS_LABEL: Record<AcademicLeaveStatus, string> = {
  pending: "Pending advisor",
  faculty_approved: "Pending HoD",
  hod_approved: "HoD approved",
  rejected: "Rejected",
};

export default function LeaveRequestsPage() {
  const outings = useOutings({ page_size: 100 });
  const hostelLeaves = useHostelLeaveRequests({ page_size: 100 });
  const academicLeaves = useAcademicHostelLeaves({ page_size: 100 });
  const decideOuting = useDecideOuting();
  const decideHostelLeave = useDecideHostelLeaveRequest();

  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const rows: CombinedRow[] = useMemo(() => {
    const fromOutings: CombinedRow[] = (outings.data?.data ?? []).filter(isMultiDayOuting).map((o: Outing) => ({
      key: `outing-${o.id}`,
      kind: "outing",
      id: o.id,
      student: o.student,
      room_number: o.room_number,
      from_date: o.from_date,
      to_date: o.to_date,
      reason: o.reason,
      status: normalizeStatus(o.status),
      created_at: o.created_at,
    }));
    const fromHostelLeaves: CombinedRow[] = (hostelLeaves.data?.data ?? []).map((l: HostelLeaveRequest) => ({
      key: `leave-${l.id}`,
      kind: "hostel_leave",
      id: l.id,
      student: l.student,
      room_number: l.room_number,
      from_date: l.from_date,
      to_date: l.to_date,
      reason: l.reason,
      status: normalizeStatus(l.status),
      created_at: l.created_at,
    }));
    return [...fromOutings, ...fromHostelLeaves].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [outings.data, hostelLeaves.data]);

  const counts = {
    all: rows.length,
    pending: rows.filter((r) => r.status === "pending").length,
    approved: rows.filter((r) => r.status === "approved").length,
    rejected: rows.filter((r) => r.status === "rejected").length,
  };

  const filtered = rows.filter((r) => {
    if (filter !== "all" && r.status !== filter) return false;
    if (search && !`${r.student.name} ${r.student.student_id_no} ${r.room_number ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const decide = (row: CombinedRow, decision: "approved" | "rejected") => {
    if (row.kind === "outing") decideOuting.mutate({ id: row.id, decision });
    else decideHostelLeave.mutate({ id: row.id, decision });
  };
  const deciding = decideOuting.isPending || decideHostelLeave.isPending;

  const columns: DataTableColumn<CombinedRow>[] = [
    {
      key: "student",
      header: "Student",
      width: "1.5fr",
      render: (row) => (
        <div>
          <button type="button" onClick={() => setSelectedId(row.student.id)} className="font-bold text-ink hover:text-primary hover:underline">
            {row.student.name}
          </button>
          <div className="text-[12px] text-subtle">{row.room_number ?? "—"}</div>
        </div>
      ),
    },
    {
      key: "kind",
      header: "Type",
      width: "0.9fr",
      render: (row) => <span className="text-[12.5px] font-semibold text-muted">{KIND_LABEL[row.kind]}</span>,
    },
    { key: "duration", header: "Duration", width: "0.9fr", render: (row) => <span className="font-mono text-body">{durationDays(row.from_date, row.to_date)} days</span> },
    {
      key: "dates",
      header: "Dates",
      width: "1.5fr",
      render: (row) => (
        <span className="font-mono text-[12.5px] text-body">
          {formatDisplayDate(row.from_date)} – {formatDisplayDate(row.to_date)}
        </span>
      ),
    },
    { key: "reason", header: "Reason", width: "1.5fr", render: (row) => <span className="text-body">{row.reason ?? "—"}</span> },
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
              onClick={() => decide(row, "rejected")}
              disabled={deciding}
              className="rounded-[7px] border border-border-default px-2.5 py-1.5 text-[12.5px] font-bold text-body hover:bg-surface-tint"
            >
              Reject
            </button>
            <button
              type="button"
              onClick={() => decide(row, "approved")}
              disabled={deciding}
              className="rounded-[7px] bg-primary px-2.5 py-1.5 text-[12.5px] font-bold text-white hover:bg-primary-dark"
            >
              Approve
            </button>
          </div>
        ) : null,
    },
  ];

  const TABS: { key: FilterKey; label: string; count: number }[] = [
    { key: "pending", label: "Pending", count: counts.pending },
    { key: "approved", label: "Approved", count: counts.approved },
    { key: "rejected", label: "Rejected", count: counts.rejected },
    { key: "all", label: "History", count: counts.all },
  ];

  const academicRows = academicLeaves.data?.data ?? [];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div>
        <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Leave requests</h1>
        <p className="mt-1 text-[13px] text-muted">Multi-day home visits and hostel leave requests.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <PillTabs
          options={TABS.map((t) => ({ key: t.key, label: `${t.label} (${t.count})` }))}
          value={filter}
          onChange={(k) => setFilter(k as FilterKey)}
        />
        <div className="flex-1" />
        <SearchBar className="w-[280px]" placeholder="Student, register number or room" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {outings.isLoading || hostelLeaves.isLoading ? (
        <EmptyState message="Loading…" />
      ) : (
        <DataTable columns={columns} data={filtered} rowKey={(row) => row.key} emptyMessage="No leave requests in this view." hoverableRows />
      )}

      <div className="mt-2 flex flex-col gap-2">
        <div>
          <h2 className="text-[17px] font-extrabold text-ink">Academic leave — hostel notified</h2>
          <p className="mt-0.5 text-[12.5px] text-muted">
            Requests students filed on the academic Leave tab and ticked "Also on hostel leave" — routed through their class advisor then the HoD, not this
            queue. Shown here for visibility only; there is nothing to approve.
          </p>
        </div>
        {academicLeaves.isLoading ? (
          <EmptyState message="Loading…" />
        ) : (
          <DataTable
            columns={[
              {
                key: "student",
                header: "Student",
                width: "1.6fr",
                render: (row) => (
                  <button type="button" onClick={() => setSelectedId(row.student.id)} className="font-bold text-ink hover:text-primary hover:underline">
                    {row.student.name}
                  </button>
                ),
              },
              { key: "duration", header: "Duration", width: "0.9fr", render: (row) => <span className="font-mono text-body">{durationDays(row.from_date, row.to_date)} days</span> },
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
              { key: "reason", header: "Reason", width: "1.8fr", render: (row) => <span className="text-body">{row.reason ?? "—"}</span> },
              {
                key: "status",
                header: "Academic status",
                width: "1.2fr",
                align: "right",
                render: (row) => <Badge tone={ACADEMIC_STATUS_TONE[row.status]}>{ACADEMIC_STATUS_LABEL[row.status]}</Badge>,
              },
            ]}
            data={academicRows}
            rowKey={(row) => row.id}
            emptyMessage="No hostel-flagged academic leaves right now."
            hoverableRows
          />
        )}
      </div>

      {selectedId != null && <StudentDetailModal studentId={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  );
}
