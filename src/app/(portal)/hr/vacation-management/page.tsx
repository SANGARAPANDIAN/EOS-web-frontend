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
  Textarea,
  type DataTableColumn,
} from "@/components/ui";
import type { BadgeTone } from "@/components/ui/Badge";
import {
  useCreateHrVacationEntry,
  useDeleteHrVacationEntry,
  useHrRequests,
  type ApprovalStatus,
  type HrUnifiedRequest,
} from "@/modules/hr/api/requests";
import { useHrFaculties } from "@/modules/hr/api/facultyDirectory";
import { useLeaveTypes } from "@/modules/hr/api/leaveTypes";
import { formatDisplayDate, toIsoDateString, todayDateOnly } from "@/lib/utils/date";
import { ApiError } from "@/types/api";

const STATUS_TONE: Record<ApprovalStatus, BadgeTone> = {
  pending: "neutral",
  approved: "accent",
  rejected: "danger",
};

function facultyName(f: { first_name: string; last_name: string }): string {
  return `${f.first_name} ${f.last_name}`.trim();
}

function dateOnly(iso: string): string {
  return iso.slice(0, 10);
}

function formatDateRange(from: string, to: string): string {
  return dateOnly(from) === dateOnly(to) ? formatDisplayDate(from) : `${formatDisplayDate(from)} – ${formatDisplayDate(to)}`;
}

function monthBounds(date: Date = new Date()): { start: string; end: string } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start: toIsoDateString(start), end: toIsoDateString(end) };
}

interface AddFormState {
  facultyId: string;
  kind: "leave" | "od";
  date: string;
  leaveTypeId: string;
  reason: string;
}

function emptyAddForm(): AddFormState {
  return { facultyId: "", kind: "leave", date: todayDateOnly(), leaveTypeId: "", reason: "" };
}

function AddEntryModal({ onClose }: { onClose: () => void }) {
  const createEntry = useCreateHrVacationEntry();
  const faculties = useHrFaculties({ status: "active", limit: 200 });
  const leaveTypes = useLeaveTypes();
  const [form, setForm] = useState<AddFormState>(emptyAddForm());
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof AddFormState>(key: K, value: AddFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit() {
    if (!form.facultyId) {
      setError("Choose a faculty member.");
      return;
    }
    if (!form.date) {
      setError("Choose a date.");
      return;
    }
    setError(null);
    try {
      await createEntry.mutateAsync({
        faculty_id: Number(form.facultyId),
        kind: form.kind,
        date: form.date,
        reason: form.reason.trim() || undefined,
        leave_type_id: form.kind === "leave" && form.leaveTypeId ? Number(form.leaveTypeId) : undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not record this entry.");
    }
  }

  return (
    <Modal open onClose={onClose} title="Record a leave / OD entry" subtitle="Directly registers a single-day entry on someone's behalf">
      <div className="flex flex-col gap-3.5">
        <div>
          <div className="mb-1.5 text-[13px] font-bold text-body">Faculty</div>
          <Select value={form.facultyId} onChange={(e) => update("facultyId", e.target.value)}>
            <option value="">Select faculty…</option>
            {faculties.data?.data.map((f) => (
              <option key={f.id} value={f.id}>
                {facultyName(f)} — {f.designation}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3.5">
          <div>
            <div className="mb-1.5 text-[13px] font-bold text-body">Kind</div>
            <Select value={form.kind} onChange={(e) => update("kind", e.target.value as "leave" | "od")}>
              <option value="leave">Leave</option>
              <option value="od">On duty</option>
            </Select>
          </div>
          <div>
            <div className="mb-1.5 text-[13px] font-bold text-body">Date</div>
            <Input type="date" value={form.date} onChange={(e) => update("date", e.target.value)} />
          </div>
        </div>

        {form.kind === "leave" && (
          <div>
            <div className="mb-1.5 text-[13px] font-bold text-body">Leave type</div>
            <Select value={form.leaveTypeId} onChange={(e) => update("leaveTypeId", e.target.value)}>
              <option value="">Not specified</option>
              {leaveTypes.data?.map((lt) => (
                <option key={lt.id} value={lt.id}>
                  {lt.name}
                </option>
              ))}
            </Select>
          </div>
        )}

        <div>
          <div className="mb-1.5 text-[13px] font-bold text-body">Reason (optional)</div>
          <Textarea rows={2} value={form.reason} onChange={(e) => update("reason", e.target.value)} placeholder="Why this entry is being recorded" />
        </div>

        {error && <div className="text-[13px] font-semibold text-danger-fg">{error}</div>}
      </div>

      <div className="mt-6 flex justify-end gap-2.5">
        <Button variant="secondary" className="w-auto" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primarySmall" className="w-auto" onClick={submit} disabled={createEntry.isPending}>
          {createEntry.isPending ? "Saving…" : "Save entry"}
        </Button>
      </div>
    </Modal>
  );
}

export default function HrVacationManagementPage() {
  const bounds = useMemo(() => monthBounds(), []);
  const [fromDate, setFromDate] = useState(bounds.start);
  const [toDate, setToDate] = useState(bounds.end);
  const [facultyId, setFacultyId] = useState("");
  const [kind, setKind] = useState<"" | "leave" | "od">("");
  const [showAdd, setShowAdd] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<HrUnifiedRequest | null>(null);

  const requests = useHrRequests({
    faculty_id: facultyId ? Number(facultyId) : undefined,
    kind: kind || undefined,
    limit: 200,
  });
  const faculties = useHrFaculties({ status: "active", limit: 200 });
  const deleteEntry = useDeleteHrVacationEntry();

  function updateFromDate(value: string) {
    setFromDate(value);
    if (value && toDate && value > toDate) setToDate(value);
  }

  const filtered = useMemo(() => {
    const rows = requests.data?.data ?? [];
    return rows
      .filter((r) => dateOnly(r.to_date) >= fromDate && dateOnly(r.from_date) <= toDate)
      .sort((a, b) => b.from_date.localeCompare(a.from_date));
  }, [requests.data, fromDate, toDate]);

  const columns: DataTableColumn<HrUnifiedRequest>[] = [
    {
      key: "faculty",
      header: "Faculty",
      width: "1.5fr",
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar name={facultyName(row.faculty)} imageUrl={row.faculty.profile_url} size={32} />
          <div className="min-w-0">
            <div className="truncate font-bold text-ink">{facultyName(row.faculty)}</div>
            <div className="truncate text-[12px] text-muted">{row.faculty.department.name}</div>
          </div>
        </div>
      ),
    },
    {
      key: "kind",
      header: "Kind",
      align: "center",
      render: (row) => <Badge tone={row.kind === "leave" ? "accentDark" : "neutral"}>{row.kind === "leave" ? "Leave" : "OD"}</Badge>,
    },
    { key: "dates", header: "Dates", render: (row) => formatDateRange(row.from_date, row.to_date) },
    { key: "detail", header: "Type / reason", render: (row) => row.leave_type?.name ?? row.detail ?? "—" },
    {
      key: "status",
      header: "Status",
      align: "center",
      render: (row) => <Badge tone={STATUS_TONE[row.overall_status]}>{row.overall_status}</Badge>,
    },
    { key: "created_at", header: "Recorded", render: (row) => formatDisplayDate(row.created_at) },
    {
      key: "actions",
      header: "",
      width: "60px",
      align: "right",
      render: (row) => (
        <IconButton icon="delete" size={32} iconSize={16} className="text-danger-fg" onClick={() => setDeleteTarget(row)} />
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Vacation management</h1>
          <p className="mt-1 text-[13px] text-muted">
            Record a single-day leave/OD entry on a faculty member&apos;s behalf, or remove one — to approve or reject an
            incoming request instead, use the Requests page.
          </p>
        </div>
        <Button variant="primarySmall" className="inline-flex w-auto items-center gap-1.5 px-5 py-3" onClick={() => setShowAdd(true)}>
          <Icon name="add" size={16} />
          Record entry
        </Button>
      </div>

      {requests.isError && (
        <Banner>{requests.error instanceof ApiError ? requests.error.message : "Could not load leave / OD entries."}</Banner>
      )}

      <Card className="flex flex-wrap items-center gap-3 p-4">
        <div className="flex items-center gap-2">
          <span className="text-[12.5px] font-bold text-muted">From</span>
          <Input type="date" value={fromDate} onChange={(e) => updateFromDate(e.target.value)} className="w-auto" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[12.5px] font-bold text-muted">To</span>
          <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-auto" />
        </div>
        <Select value={kind} onChange={(e) => setKind(e.target.value as "" | "leave" | "od")} className="w-auto">
          <option value="">Leave + OD</option>
          <option value="leave">Leave only</option>
          <option value="od">OD only</option>
        </Select>
        <Select value={facultyId} onChange={(e) => setFacultyId(e.target.value)} className="w-auto min-w-[200px]">
          <option value="">All faculty</option>
          {faculties.data?.data.map((f) => (
            <option key={f.id} value={f.id}>
              {facultyName(f)}
            </option>
          ))}
        </Select>
      </Card>

      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(row) => row.id}
        loading={requests.isLoading}
        emptyMessage="No leave / OD entries in this date range."
      />

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
          deleteEntry.mutate(
            { kind: deleteTarget.kind, sourceId: deleteTarget.source_id },
            { onSuccess: () => setDeleteTarget(null) },
          );
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
