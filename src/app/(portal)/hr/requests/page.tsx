"use client";

import { useState } from "react";
import {
  Avatar,
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  Icon,
  IconButton,
  Input,
  Modal,
  PillTabs,
  SegmentedTabs,
  Select,
  Textarea,
} from "@/components/ui";
import type { BadgeTone } from "@/components/ui/Badge";
import type { DataTableColumn } from "@/components/ui/DataTable";
import {
  useCreateHrVacationEntry,
  useDeleteHrVacationEntry,
  useHrRequestDecision,
  useHrRequests,
  type ApprovalStatus,
  type HrUnifiedRequest,
} from "@/modules/hr/api/requests";
import { useHrDepartments } from "@/modules/hr/api/departments";
import { useHrFaculties } from "@/modules/hr/api/facultyDirectory";
import { useLeaveTypes } from "@/modules/hr/api/leaveTypes";
import { formatDisplayDate, todayDateOnly } from "@/lib/utils/date";
import { ApiError } from "@/types/api";

const LIMIT = 20;

function statusTone(status: ApprovalStatus): BadgeTone {
  if (status === "approved") return "accent";
  if (status === "rejected") return "danger";
  return "neutral";
}

function statusLabel(status: ApprovalStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function facultyName(f: HrUnifiedRequest["faculty"]): string {
  return [f.prefix, f.first_name, f.last_name].filter(Boolean).join(" ");
}

function dateRangeLabel(row: HrUnifiedRequest): string {
  return row.from_date === row.to_date
    ? formatDisplayDate(row.from_date)
    : `${formatDisplayDate(row.from_date)} – ${formatDisplayDate(row.to_date)}`;
}

interface RecordEntryModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Thin wrapper only — `Modal` renders no children at all while `open` is
 * false, so `RecordEntryForm` below is unmounted while closed and mounts
 * fresh (plain initial state) each time it opens. That gives us "reset on
 * open" for free, without a reset-on-open effect (which the repo's
 * react-hooks/set-state-in-effect lint rule flags).
 */
function RecordEntryModal({ open, onClose }: RecordEntryModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record an entry"
      subtitle="Directly records a single-day leave or OD entry, e.g. from Vacation Management."
    >
      <RecordEntryForm onClose={onClose} />
    </Modal>
  );
}

function RecordEntryForm({ onClose }: { onClose: () => void }) {
  const faculties = useHrFaculties({ status: "active", limit: 200 });
  const leaveTypes = useLeaveTypes();
  const createEntry = useCreateHrVacationEntry();

  const [facultyId, setFacultyId] = useState("");
  const [kind, setKind] = useState<"leave" | "od">("leave");
  const [date, setDate] = useState(todayDateOnly());
  const [reason, setReason] = useState("");
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const canSubmit = facultyId !== "" && date !== "" && (kind !== "leave" || leaveTypeId !== "");

  async function submit() {
    if (!canSubmit) {
      setError(kind === "leave" && !leaveTypeId ? "Pick a leave type." : "Faculty and date are required.");
      return;
    }
    setError(null);
    try {
      await createEntry.mutateAsync({
        faculty_id: Number(facultyId),
        kind,
        date,
        reason: reason.trim() || undefined,
        leave_type_id: kind === "leave" ? Number(leaveTypeId) : undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save this entry.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-bold text-body">Faculty</label>
        <Select value={facultyId} onChange={(e) => setFacultyId(e.target.value)}>
          <option value="">Select faculty</option>
          {faculties.data?.data.map((f) => (
            <option key={f.id} value={f.id}>
              {f.first_name} {f.last_name}
              {f.department ? ` — ${f.department.name}` : ""}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-bold text-body">Kind</label>
        <SegmentedTabs
          value={kind}
          onChange={(k) => setKind(k as "leave" | "od")}
          options={[
            { key: "leave", label: "Leave" },
            { key: "od", label: "On duty" },
          ]}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-bold text-body">Date</label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        {kind === "leave" && (
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-body">Leave type</label>
            <Select value={leaveTypeId} onChange={(e) => setLeaveTypeId(e.target.value)}>
              <option value="">Select type</option>
              {leaveTypes.data?.map((lt) => (
                <option key={lt.id} value={lt.id}>
                  {lt.name}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-bold text-body">Reason</label>
        <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Optional note" />
      </div>

      {error && <div className="text-[13px] font-semibold text-danger-fg">{error}</div>}

      <div className="mt-2 flex justify-end gap-2.5 border-t border-divider pt-5">
        <Button variant="secondary" className="w-auto" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primarySmall" className="w-auto px-6" onClick={submit} disabled={createEntry.isPending || !canSubmit}>
          {createEntry.isPending ? "Saving…" : "Save entry"}
        </Button>
      </div>
    </div>
  );
}

export default function HrRequestsPage() {
  const [departmentId, setDepartmentId] = useState("all");
  const [kind, setKind] = useState<"all" | "leave" | "od">("all");
  const [status, setStatus] = useState<"all" | ApprovalStatus>("all");
  const [page, setPage] = useState(1);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<HrUnifiedRequest | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const departments = useHrDepartments();
  const requests = useHrRequests({
    department_id: departmentId !== "all" ? Number(departmentId) : undefined,
    kind: kind !== "all" ? kind : undefined,
    status: status !== "all" ? status : undefined,
    page,
    limit: LIMIT,
  });
  const decision = useHrRequestDecision();
  const deleteEntry = useDeleteHrVacationEntry();

  const rows = requests.data?.data ?? [];
  const meta = requests.data?.meta;

  function handleDecision(row: HrUnifiedRequest, next: "approved" | "rejected") {
    setActionError(null);
    decision.mutate(
      { kind: row.kind, sourceId: row.source_id, decision: next },
      { onError: (err) => setActionError(err instanceof ApiError ? err.message : "Could not update this request.") },
    );
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    deleteEntry.mutate(
      { kind: deleteTarget.kind, sourceId: deleteTarget.source_id },
      {
        onSuccess: () => setDeleteTarget(null),
        onError: (err) => {
          setActionError(err instanceof ApiError ? err.message : "Could not delete this entry.");
          setDeleteTarget(null);
        },
      },
    );
  }

  const columns: DataTableColumn<HrUnifiedRequest>[] = [
    {
      key: "faculty",
      header: "Faculty",
      width: "1.6fr",
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={facultyName(row.faculty)} imageUrl={row.faculty.profile_url} size={32} />
          <div className="min-w-0">
            <div className="truncate text-[13.5px] font-bold text-ink">{facultyName(row.faculty)}</div>
            <div className="truncate text-[12px] text-subtle">{row.faculty.department.name}</div>
          </div>
        </div>
      ),
    },
    {
      key: "kind",
      header: "Kind",
      width: "80px",
      render: (row) => <Badge tone="neutral">{row.kind === "leave" ? "Leave" : "OD"}</Badge>,
    },
    {
      key: "dates",
      header: "Dates",
      width: "170px",
      render: (row) => <span className="text-[13px] font-bold text-ink">{dateRangeLabel(row)}</span>,
    },
    {
      key: "leave_type",
      header: "Type",
      width: "120px",
      render: (row) =>
        row.kind === "leave" && row.leave_type ? (
          <span className="text-[13px] text-body">{row.leave_type.name}</span>
        ) : (
          <span className="text-subtle">—</span>
        ),
    },
    {
      key: "hod",
      header: "HOD",
      width: "100px",
      render: (row) => <Badge tone={statusTone(row.hod_approval_status)}>{statusLabel(row.hod_approval_status)}</Badge>,
    },
    {
      key: "hr",
      header: "HR",
      width: "100px",
      render: (row) => <Badge tone={statusTone(row.hr_approval_status)}>{statusLabel(row.hr_approval_status)}</Badge>,
    },
    {
      key: "overall",
      header: "Overall",
      width: "100px",
      render: (row) => <Badge tone={statusTone(row.overall_status)}>{statusLabel(row.overall_status)}</Badge>,
    },
    {
      key: "actions",
      header: "",
      width: "260px",
      align: "right",
      render: (row) => {
        const hodBlocking = row.hod_approval_status !== "approved";
        const alreadyDecided = row.hr_approval_status !== "pending";
        const disabled = hodBlocking || alreadyDecided || decision.isPending;
        const title = hodBlocking
          ? "HOD has not approved this request yet."
          : alreadyDecided
            ? "HR has already decided on this request."
            : undefined;
        return (
          <div className="flex justify-end gap-1.5">
            <Button variant="primarySmall" disabled={disabled} title={title} onClick={() => handleDecision(row, "approved")}>
              Approve
            </Button>
            <Button
              variant="secondary"
              className="px-3.5 py-2.5 text-[12.5px]"
              disabled={disabled}
              title={title}
              onClick={() => handleDecision(row, "rejected")}
            >
              Reject
            </Button>
            <IconButton
              icon="delete"
              size={34}
              iconSize={17}
              title="Delete this entry"
              onClick={() => setDeleteTarget(row)}
            />
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div>
        <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Requests</h1>
        <p className="mt-1 text-[13px] text-muted">
          Unified leave and on-duty inbox · HR can only decide once the Head of Department has approved
        </p>
      </div>

      {actionError && (
        <div className="rounded-[10px] border border-danger-border bg-danger-bg px-3.5 py-2.5 text-[13px] font-semibold text-danger-fg">
          {actionError}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={departmentId}
            onChange={(e) => {
              setDepartmentId(e.target.value);
              setPage(1);
            }}
            className="w-[200px]"
          >
            <option value="all">All departments</option>
            {departments.data?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>

          <SegmentedTabs
            value={kind}
            onChange={(k) => {
              setKind(k as typeof kind);
              setPage(1);
            }}
            options={[
              { key: "all", label: "All kinds" },
              { key: "leave", label: "Leave" },
              { key: "od", label: "OD" },
            ]}
          />

          <PillTabs
            value={status}
            onChange={(k) => {
              setStatus(k as typeof status);
              setPage(1);
            }}
            options={[
              { key: "all", label: "All" },
              { key: "pending", label: "Pending" },
              { key: "approved", label: "Approved" },
              { key: "rejected", label: "Rejected" },
            ]}
          />
        </div>

        <Button variant="primarySmall" className="w-auto shrink-0" onClick={() => setShowRecordModal(true)}>
          <Icon name="add" size={16} className="mr-1.5 align-middle" />
          Record entry
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        rowKey={(row) => row.id}
        loading={requests.isLoading}
        emptyMessage="No requests match these filters."
      />

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-[12.5px] text-muted">
          <span>
            Page {meta.page} of {meta.totalPages} · {meta.total} total
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" className="w-auto px-4 py-2" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button
              variant="secondary"
              className="w-auto px-4 py-2"
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <RecordEntryModal open={showRecordModal} onClose={() => setShowRecordModal(false)} />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete this entry?"
        description={
          deleteTarget
            ? `Removes the ${deleteTarget.kind === "leave" ? "leave" : "OD"} entry for ${facultyName(deleteTarget.faculty)} on ${dateRangeLabel(deleteTarget)}.`
            : undefined
        }
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
