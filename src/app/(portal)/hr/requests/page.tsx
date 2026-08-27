"use client";

import { useState, type ReactNode } from "react";
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
  SegmentedTabs,
  Select,
  StatCard,
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
import { HrFacultyPicker } from "@/modules/hr/components/HrFacultyPicker";
import type { HrFaculty } from "@/modules/hr/api/facultyDirectory";
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

/** A labelled cell, so the toolbar and form read as forms rather than rows of loose controls. */
function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[.05em] text-muted">{label}</label>
      {children}
    </div>
  );
}

interface RecordEntryModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Thin wrapper only — `Modal` renders no children at all while `open` is
 * false, so `RecordEntryForm` below is unmounted while closed and mounts
 * fresh (plain initial state) each time it opens. That gives us "reset on
 * open" for free, without a reset-on-open effect (which the repo lint rule
 * react-hooks/set-state-in-effect flags).
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
  const leaveTypes = useLeaveTypes();
  const createEntry = useCreateHrVacationEntry();

  const [faculty, setFaculty] = useState<HrFaculty | null>(null);
  const [kind, setKind] = useState<"leave" | "od">("leave");
  const [date, setDate] = useState(todayDateOnly());
  const [reason, setReason] = useState("");
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const canSubmit = faculty !== null && date !== "" && (kind !== "leave" || leaveTypeId !== "");

  async function submit() {
    if (faculty === null || !canSubmit) {
      setError(kind === "leave" && !leaveTypeId ? "Pick a leave type." : "Faculty and date are required.");
      return;
    }
    setError(null);
    try {
      await createEntry.mutateAsync({
        faculty_id: faculty.id,
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
      <Field label="Faculty">
        <HrFacultyPicker value={faculty} onChange={setFaculty} />
      </Field>

      <Field label="Kind">
        <SegmentedTabs
          value={kind}
          onChange={(k) => setKind(k as "leave" | "od")}
          options={[
            { key: "leave", label: "Leave" },
            { key: "od", label: "On duty" },
          ]}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Date">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        {kind === "leave" && (
          <Field label="Leave type">
            <Select value={leaveTypeId} onChange={(e) => setLeaveTypeId(e.target.value)}>
              <option value="">Select type</option>
              {leaveTypes.data?.map((lt) => (
                <option key={lt.id} value={lt.id}>
                  {lt.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </div>

      <Field label="Reason">
        <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Optional note" />
      </Field>

      {error && <div className="text-[13px] font-semibold text-danger-fg">{error}</div>}

      <div className="mt-2 flex justify-end gap-2.5 border-t border-divider pt-5">
        <Button variant="secondary" className="w-auto" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primarySmall"
          className="w-auto px-6"
          onClick={submit}
          disabled={createEntry.isPending || !canSubmit}
        >
          {createEntry.isPending ? "Saving…" : "Save entry"}
        </Button>
      </div>
    </div>
  );
}

export default function HrRequestsPage() {
  // Inbox = still moving through the HOD → HR chain; History = a request HR
  // (or the HOD, by rejecting) has already finished deciding on — a
  // permanent record, same split the stat cards already implied but not
  // previously surfaced as its own view.
  const [view, setView] = useState<"inbox" | "history">("inbox");
  const [departmentId, setDepartmentId] = useState("all");
  const [kind, setKind] = useState<"all" | "leave" | "od">("all");
  const [status, setStatus] = useState<"all" | ApprovalStatus>("all");
  // "Awaiting HR" is the queue HR can actually act on: HoD has approved and HR
  // has not decided yet. Without it, the list mixes in requests still sitting
  // with the HoD, whose Approve button can only ever fail. Only meaningful in
  // the Inbox view — every History row is already fully decided.
  const [stage, setStage] = useState<"all" | "awaiting_hr" | "awaiting_hod">("all");
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

  const allRows = requests.data?.data ?? [];
  const viewRows = allRows.filter((r) => (view === "history" ? r.overall_status !== "pending" : r.overall_status === "pending"));
  const rows =
    stage === "awaiting_hr"
      ? viewRows.filter((r) => r.hod_approval_status === "approved" && r.hr_approval_status === "pending")
      : stage === "awaiting_hod"
        ? viewRows.filter((r) => r.hod_approval_status === "pending")
        : viewRows;

  const awaitingHrCount = allRows.filter(
    (r) => r.hod_approval_status === "approved" && r.hr_approval_status === "pending",
  ).length;
  const awaitingHodCount = allRows.filter((r) => r.hod_approval_status === "pending").length;
  const approvedCount = allRows.filter((r) => r.overall_status === "approved").length;
  const rejectedCount = allRows.filter((r) => r.overall_status === "rejected").length;
  const meta = requests.data?.meta;

  const filtersActive = departmentId !== "all" || kind !== "all" || status !== "all" || stage !== "all";

  function changeView(next: "inbox" | "history") {
    setView(next);
    setStage("all");
    setStatus("all");
    setPage(1);
  }

  function resetFilters() {
    setDepartmentId("all");
    setKind("all");
    setStatus("all");
    setStage("all");
    setPage(1);
  }

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
      key: "request",
      header: "Request",
      width: "minmax(190px, 1.5fr)",
      // Kind, dates and leave type were three separate narrow columns that each
      // had too little room to read. They describe one thing, so they share a
      // cell now.
      render: (row) => (
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Badge tone={row.kind === "leave" ? "accentDark" : "neutral"}>
              {row.kind === "leave" ? "Leave" : "OD"}
            </Badge>
            <span className="truncate text-[13px] font-bold text-ink">{dateRangeLabel(row)}</span>
          </div>
          <div className="mt-0.5 truncate text-[11.5px] text-subtle">
            {row.kind === "leave" ? (row.leave_type?.name ?? "Type not specified") : (row.detail ?? "On duty")}
          </div>
        </div>
      ),
    },
    {
      key: "approvals",
      header: "Approval chain",
      width: "minmax(190px, 1.2fr)",
      // The chain is HOD then HR, so it reads as a sequence rather than as two
      // unrelated status columns.
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <Badge tone={statusTone(row.hod_approval_status)}>HOD · {statusLabel(row.hod_approval_status)}</Badge>
          <Icon name="chevron_right" size={14} className="shrink-0 text-subtle" />
          <Badge tone={statusTone(row.hr_approval_status)}>HR · {statusLabel(row.hr_approval_status)}</Badge>
        </div>
      ),
    },
    {
      key: "overall",
      header: "Outcome",
      width: "110px",
      align: "center",
      render: (row) => <Badge tone={statusTone(row.overall_status)}>{statusLabel(row.overall_status)}</Badge>,
    },
    {
      key: "actions",
      header: "Action",
      width: "150px",
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
          <div className="flex items-center justify-end gap-1.5">
            {disabled ? (
              // Nothing for HR to do yet, so say why instead of showing two dead
              // buttons whose only possible outcome is an error.
              <span className="truncate text-[11.5px] text-subtle" title={title}>
                {hodBlocking ? "Awaiting HOD" : `HR ${row.hr_approval_status}`}
              </span>
            ) : (
              <>
                <IconButton
                  icon="check"
                  size={32}
                  iconSize={17}
                  title="Approve"
                  onClick={() => handleDecision(row, "approved")}
                />
                <IconButton
                  icon="close"
                  size={32}
                  iconSize={17}
                  title="Reject"
                  className="text-danger-fg"
                  onClick={() => handleDecision(row, "rejected")}
                />
              </>
            )}
            <IconButton
              icon="delete"
              size={32}
              iconSize={16}
              title="Delete this entry"
              className="text-danger-fg"
              onClick={() => setDeleteTarget(row)}
            />
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Requests</h1>
          <p className="mt-1 text-[13px] text-muted">
            {view === "history"
              ? "Every leave and on-duty request already decided — a permanent record."
              : "Unified leave and on-duty inbox · HR can only decide once the Head of Department has approved"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SegmentedTabs
            value={view}
            onChange={changeView}
            options={[
              { key: "inbox", label: "Inbox" },
              { key: "history", label: "History" },
            ]}
          />
          <Button
            variant="primarySmall"
            className="inline-flex w-auto shrink-0 items-center gap-1.5 px-5 py-3"
            onClick={() => setShowRecordModal(true)}
          >
            <Icon name="add" size={16} />
            Record entry
          </Button>
        </div>
      </div>

      {actionError && <Banner>{actionError}</Banner>}
      {requests.isError && (
        <Banner>{requests.error instanceof ApiError ? requests.error.message : "Could not load requests."}</Banner>
      )}

      {/* Counts are over the loaded page, which is exactly what the table below
          shows — labelled as such so they are not read as college-wide totals. */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Awaiting HR"
          icon="pending_actions"
          value={awaitingHrCount}
          sub="HOD approved, HR to decide"
        />
        <StatCard label="Awaiting HOD" icon="hourglass_top" value={awaitingHodCount} sub="Not yet with HR" />
        <StatCard label="Approved" icon="task_alt" value={approvedCount} sub="On this page" />
        <StatCard label="Rejected" icon="block" value={rejectedCount} sub="On this page" />
      </div>

      <Card className="flex flex-col gap-4 p-[18px_20px]">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[15px] font-extrabold text-ink">Filters</h2>
          {filtersActive && (
            <button type="button" onClick={resetFilters} className="text-[12.5px] font-bold text-primary">
              Clear all
            </button>
          )}
        </div>

        <div className={`grid grid-cols-1 gap-4 md:grid-cols-2 ${view === "inbox" ? "xl:grid-cols-4" : "xl:grid-cols-3"}`}>
          <Field label="Department">
            <Select
              value={departmentId}
              onChange={(e) => {
                setDepartmentId(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All departments</option>
              {departments.data?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Kind">
            <SegmentedTabs
              value={kind}
              onChange={(k) => {
                setKind(k);
                setPage(1);
              }}
              options={[
                { key: "all", label: "All" },
                { key: "leave", label: "Leave" },
                { key: "od", label: "OD" },
              ]}
            />
          </Field>

          <Field label="Status">
            <SegmentedTabs
              value={status}
              onChange={(s) => {
                setStatus(s);
                setPage(1);
              }}
              options={
                // Each view can only ever contain one side of this split
                // (Inbox = pending, History = approved/rejected), so the
                // options offered here only ever include values that can
                // actually return a row — never a combination guaranteed to
                // come back empty.
                view === "history"
                  ? [
                      { key: "all", label: "Any" },
                      { key: "approved", label: "Approved" },
                      { key: "rejected", label: "Rejected" },
                    ]
                  : [
                      { key: "all", label: "Any" },
                      { key: "pending", label: "Pending" },
                    ]
              }
            />
          </Field>

          {/* Stage (still-in-progress vs which side it's sitting with) only
              means something for the Inbox — every History row is already
              fully decided by both HOD and HR. */}
          {view === "inbox" && (
            <Field label="Stage">
              <SegmentedTabs
                value={stage}
                onChange={setStage}
                options={[
                  { key: "all", label: "Any" },
                  { key: "awaiting_hr", label: `Awaiting HR${awaitingHrCount > 0 ? ` (${awaitingHrCount})` : ""}` },
                  { key: "awaiting_hod", label: `Awaiting HOD${awaitingHodCount > 0 ? ` (${awaitingHodCount})` : ""}` },
                ]}
              />
            </Field>
          )}
        </div>
      </Card>

      <Card className="flex flex-col gap-3 p-[18px_20px]">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[15px] font-extrabold text-ink">{view === "history" ? "Decided requests" : "Request inbox"}</h2>
          <span className="text-[12px] text-subtle">
            {rows.length} shown{meta ? ` · ${meta.total} total` : ""}
          </span>
        </div>

        <div className="overflow-x-auto">
          <DataTable
            columns={columns}
            data={rows}
            rowKey={(row) => row.id}
            loading={requests.isLoading}
            emptyMessage="No requests match these filters."
          />
        </div>

        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-divider pt-3 text-[12.5px] text-muted">
            <span>
              Page {meta.page} of {meta.totalPages} · {meta.total} total
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="w-auto px-4 py-2"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
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
      </Card>

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
