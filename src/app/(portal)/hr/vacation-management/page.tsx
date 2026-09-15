"use client";

import { useMemo, useState } from "react";
import {
  Avatar,
  Badge,
  Banner,
  Button,
  Card,
  ConfirmDialog,
  DataTable,
  Icon,
  IconButton,
  Input,
  Modal,
  Select,
  StatCard,
  type DataTableColumn,
} from "@/components/ui";
import type { BadgeTone } from "@/components/ui/Badge";
import {
  useDeleteHrVacationEntry,
  useHrRequests,
  type ApprovalStatus,
  type HrUnifiedRequest,
} from "@/modules/hr/api/requests";
import { HrFacultyPicker } from "@/modules/hr/components/HrFacultyPicker";
import type { HrFaculty } from "@/modules/hr/api/facultyDirectory";
import { Field, RecordVacationEntryForm } from "@/modules/hr/components/RecordVacationEntryForm";
import { formatDisplayDate, toIsoDateString } from "@/lib/utils/date";
import { ApiError } from "@/types/api";

const STATUS_TONE: Record<ApprovalStatus, BadgeTone> = {
  pending: "neutral",
  approved: "accent",
  rejected: "danger",
};

function facultyName(f: { prefix?: string | null; first_name: string; last_name: string }): string {
  return [f.prefix, f.first_name, f.last_name].filter(Boolean).join(" ");
}

function dateOnly(iso: string): string {
  return iso.slice(0, 10);
}

function formatDateRange(from: string, to: string): string {
  return dateOnly(from) === dateOnly(to)
    ? formatDisplayDate(from)
    : `${formatDisplayDate(from)} – ${formatDisplayDate(to)}`;
}

function monthBounds(date: Date = new Date()): { start: string; end: string } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start: toIsoDateString(start), end: toIsoDateString(end) };
}

function AddEntryModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal
      open
      onClose={onClose}
      title="Record a leave / OD entry"
      subtitle="Directly registers a leave/OD entry on someone's behalf"
    >
      <RecordVacationEntryForm onClose={onClose} />
    </Modal>
  );
}

export default function HrVacationManagementPage() {
  const bounds = useMemo(() => monthBounds(), []);
  const [fromDate, setFromDate] = useState(bounds.start);
  const [toDate, setToDate] = useState(bounds.end);
  const [faculty, setFaculty] = useState<HrFaculty | null>(null);
  const [kind, setKind] = useState<"" | "leave" | "od">("");
  const [showAdd, setShowAdd] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<HrUnifiedRequest | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const requests = useHrRequests({
    faculty_id: faculty?.id,
    kind: kind || undefined,
    limit: 100,
  });
  const deleteEntry = useDeleteHrVacationEntry();

  function updateFromDate(value: string) {
    setFromDate(value);
    if (value && toDate && value > toDate) setToDate(value);
  }

  function resetFilters() {
    setFromDate(bounds.start);
    setToDate(bounds.end);
    setFaculty(null);
    setKind("");
  }

  const filtersActive =
    fromDate !== bounds.start || toDate !== bounds.end || faculty !== null || kind !== "";

  const filtered = useMemo(() => {
    const rows = requests.data?.data ?? [];
    return rows
      .filter((r) => dateOnly(r.to_date) >= fromDate && dateOnly(r.from_date) <= toDate)
      .sort((a, b) => b.from_date.localeCompare(a.from_date));
  }, [requests.data, fromDate, toDate]);

  const leaveCount = filtered.filter((r) => r.kind === "leave").length;
  const odCount = filtered.filter((r) => r.kind === "od").length;
  const pendingCount = filtered.filter((r) => r.overall_status === "pending").length;

  const columns: DataTableColumn<HrUnifiedRequest>[] = [
    {
      key: "faculty",
      header: "Faculty",
      width: "minmax(210px, 1.7fr)",
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={facultyName(row.faculty)} imageUrl={row.faculty.profile_url} size={34} />
          <div className="min-w-0">
            <div className="truncate text-[13.5px] font-bold text-ink">{facultyName(row.faculty)}</div>
            <div className="truncate text-[11.5px] text-subtle">{row.faculty.department.name}</div>
          </div>
        </div>
      ),
    },
    {
      key: "entry",
      header: "Entry",
      width: "minmax(200px, 1.6fr)",
      // Kind, dates and the type/reason were three cramped columns describing
      // one entry, so they share a cell now and each has room to be read.
      render: (row) => (
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Badge tone={row.kind === "leave" ? "accentDark" : "neutral"}>
              {row.kind === "leave" ? "Leave" : "OD"}
            </Badge>
            <span className="truncate text-[13px] font-bold text-ink">
              {formatDateRange(row.from_date, row.to_date)}
            </span>
          </div>
          <div className="mt-0.5 truncate text-[11.5px] text-subtle">
            {row.leave_type?.name ?? row.detail ?? "No reason recorded"}
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "120px",
      align: "center",
      render: (row) => <Badge tone={STATUS_TONE[row.overall_status]}>{row.overall_status}</Badge>,
    },
    {
      key: "created_at",
      header: "Recorded",
      width: "130px",
      render: (row) => <span className="text-[12.5px] text-body">{formatDisplayDate(row.created_at)}</span>,
    },
    {
      key: "actions",
      header: "",
      width: "70px",
      align: "right",
      render: (row) => (
        <IconButton
          icon="delete"
          size={32}
          iconSize={16}
          title="Remove this entry"
          className="text-danger-fg"
          onClick={() => setDeleteTarget(row)}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Vacation management</h1>
          <p className="mt-1 text-[13px] text-muted">
            Record a leave/OD entry (a single day or a date range) on a faculty member&apos;s behalf, or remove one — to
            approve or reject an incoming request instead, use the Requests page.
          </p>
        </div>
        <Button
          variant="primarySmall"
          className="inline-flex w-auto shrink-0 items-center gap-1.5 px-5 py-3"
          onClick={() => setShowAdd(true)}
        >
          <Icon name="add" size={16} />
          Record entry
        </Button>
      </div>

      {requests.isError && (
        <Banner>
          {requests.error instanceof ApiError ? requests.error.message : "Could not load leave / OD entries."}
        </Banner>
      )}
      {deleteError && <Banner>{deleteError}</Banner>}

      {/* Counts describe the rows currently in view, not the whole year. */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Entries in range" icon="event_note" value={filtered.length} sub={`${fromDate} → ${toDate}`} />
        <StatCard label="Leave" icon="beach_access" value={leaveCount} sub="In this range" />
        <StatCard label="On duty" icon="work" value={odCount} sub="In this range" />
        <StatCard label="Still pending" icon="hourglass_top" value={pendingCount} sub="Not yet fully approved" />
      </div>

      <Card className="flex flex-col gap-4 p-[18px_20px]">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[15px] font-extrabold text-ink">Filters</h2>
          {filtersActive && (
            <button type="button" onClick={resetFilters} className="text-[12.5px] font-bold text-primary">
              Reset to this month
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="From">
            <Input type="date" value={fromDate} onChange={(e) => updateFromDate(e.target.value)} />
          </Field>
          <Field label="To">
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </Field>
          <Field label="Kind">
            <Select value={kind} onChange={(e) => setKind(e.target.value as "" | "leave" | "od")}>
              <option value="">All</option>
              <option value="leave">Leave only</option>
              <option value="od">OD only</option>
            </Select>
          </Field>
        </div>

        <Field label="Faculty">
          {/* A dropdown could only ever hold the first 100 of ~500 faculty, so
              this searches server-side by name, roll number or email and shows
              everyone by default. */}
          <HrFacultyPicker
            value={faculty}
            onChange={setFaculty}
            placeholder="All faculty — search by name, roll no, designation or email"
          />
        </Field>
      </Card>

      <Card className="flex flex-col gap-3 p-[18px_20px]">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[15px] font-extrabold text-ink">Recorded entries</h2>
          <span className="text-[12px] text-subtle">{filtered.length} in range</span>
        </div>
        <div className="overflow-x-auto">
          <DataTable
            columns={columns}
            data={filtered}
            rowKey={(row) => row.id}
            loading={requests.isLoading}
            emptyMessage="No leave / OD entries in this date range."
          />
        </div>
      </Card>

      {showAdd && <AddEntryModal onClose={() => setShowAdd(false)} />}

      <ConfirmDialog
        open={deleteTarget !== null}
        destructive
        title="Remove this entry?"
        description={
          deleteTarget
            ? `${facultyName(deleteTarget.faculty)} · ${deleteTarget.kind === "leave" ? "Leave" : "OD"} · ${formatDateRange(deleteTarget.from_date, deleteTarget.to_date)}. This permanently deletes the record.`
            : undefined
        }
        confirmLabel={deleteEntry.isPending ? "Removing…" : "Remove entry"}
        onConfirm={() => {
          if (!deleteTarget) return;
          setDeleteError(null);
          deleteEntry.mutate(
            { kind: deleteTarget.kind, sourceId: deleteTarget.source_id },
            {
              onSuccess: () => setDeleteTarget(null),
              onError: (err) => {
                setDeleteError(err instanceof ApiError ? err.message : "Could not remove this entry.");
                setDeleteTarget(null);
              },
            },
          );
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
