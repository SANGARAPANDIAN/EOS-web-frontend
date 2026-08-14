"use client";

import { useState } from "react";
import { Card, Badge, Button, Input, Modal, Select, DataTable, type DataTableColumn } from "@/components/ui";
import type { BadgeTone } from "@/components/ui/Badge";
import {
  useSportsReports,
  useCreateSportsReport,
  useUpdateSportsReport,
  useDeleteSportsReport,
  type SportsReport,
  type ReportStatus,
} from "@/modules/sports-admin/api/reports";
import { formatDisplayDate } from "@/lib/utils/date";
import { ApiError } from "@/types/api";

const STATUS_TONE: Record<ReportStatus, BadgeTone> = {
  draft: "neutral",
  scheduled: "accentDark",
  open: "accent",
};

export default function ReportsPage() {
  const [status, setStatus] = useState<string>("");
  const reports = useSportsReports((status as ReportStatus) || undefined);
  const createReport = useCreateSportsReport();
  const updateReport = useUpdateSportsReport();
  const deleteReport = useDeleteSportsReport();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [periodLabel, setPeriodLabel] = useState("");
  const [newStatus, setNewStatus] = useState<ReportStatus>("draft");
  const [error, setError] = useState<string | null>(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editPeriodLabel, setEditPeriodLabel] = useState("");
  const [editStatus, setEditStatus] = useState<ReportStatus>("draft");
  const [editError, setEditError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createReport.mutateAsync({
        name,
        period_label: periodLabel || undefined,
        status: newStatus,
      });
      setName("");
      setPeriodLabel("");
      setNewStatus("draft");
      setShowForm(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  }

  function openEditModal(row: SportsReport) {
    setEditingId(row.id);
    setEditName(row.name);
    setEditPeriodLabel(row.period_label ?? "");
    setEditStatus(row.status);
    setEditError(null);
    setShowEditModal(true);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEditError(null);
    if (editingId === null) return;
    try {
      await updateReport.mutateAsync({
        id: editingId,
        name: editName,
        period_label: editPeriodLabel || undefined,
        status: editStatus,
      });
      setShowEditModal(false);
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  }

  const columns: DataTableColumn<SportsReport>[] = [
    { key: "name", header: "Report", width: "1.4fr", render: (r) => <span className="font-bold text-ink">{r.name}</span> },
    {
      key: "period",
      header: "Period",
      width: "1.1fr",
      render: (r) => <span className="text-body">{r.period_label ?? "—"}</span>,
    },
    {
      key: "status",
      header: "Status",
      width: "0.9fr",
      render: (r) => <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>,
    },
    {
      key: "updated",
      header: "Updated",
      width: "1fr",
      render: (r) => <span className="font-mono text-[12.5px] text-muted">{formatDisplayDate(r.updated_at)}</span>,
    },
    {
      key: "actions",
      header: "",
      width: "0.6fr",
      align: "right",
      render: (r) => (
        <div className="flex items-center justify-end gap-3.5">
          <button onClick={() => openEditModal(r)} className="text-[12px] font-bold text-primary hover:text-primary-dark">
            Edit
          </button>
          <button
            onClick={() => deleteReport.mutate(r.id)}
            className="text-[12px] font-bold text-muted hover:text-danger-fg"
          >
            Remove
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">Reports</h1>
          <p className="mt-1 text-[13.5px] text-muted">
            {reports.data ? `${reports.data.length} report${reports.data.length === 1 ? "" : "s"}` : " "}
          </p>
        </div>
        <Button variant="secondary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancel" : "New report"}
        </Button>
      </div>

      {showForm && (
        <Card className="max-w-[480px]">
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11.5px] font-bold text-muted">Report name</label>
              <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Quarterly performance report" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11.5px] font-bold text-muted">Period</label>
              <Input value={periodLabel} onChange={(e) => setPeriodLabel(e.target.value)} placeholder="e.g. Q1 2026" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11.5px] font-bold text-muted">Status</label>
              <Select value={newStatus} onChange={(e) => setNewStatus(e.target.value as ReportStatus)}>
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
                <option value="open">Open</option>
              </Select>
            </div>
            {error && (
              <div className="rounded-[10px] border border-danger-border bg-danger-bg px-3.5 py-2.5 text-[13px] font-semibold text-danger-fg">
                {error}
              </div>
            )}
            <Button type="submit" disabled={!name || createReport.isPending}>
              {createReport.isPending ? "Creating…" : "Create report"}
            </Button>
          </form>
        </Card>
      )}

      <Card className="flex flex-wrap items-center gap-3 p-4">
        <Select className="w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
          <option value="open">Open</option>
        </Select>
      </Card>

      <DataTable
        columns={columns}
        data={reports.data ?? []}
        rowKey={(r) => r.id}
        emptyMessage={reports.isLoading ? "Loading…" : "No reports yet. Use New report to create the first one."}
      />

      <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="Edit report" subtitle={editName}>
        <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-primary">Report name</label>
            <Input required value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="e.g. Quarterly performance report" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Period</label>
              <Input value={editPeriodLabel} onChange={(e) => setEditPeriodLabel(e.target.value)} placeholder="e.g. Monthly" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Status</label>
              <Select value={editStatus} onChange={(e) => setEditStatus(e.target.value as ReportStatus)}>
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
                <option value="open">Open</option>
              </Select>
            </div>
          </div>
          {editError && (
            <div className="rounded-[10px] border border-danger-border bg-danger-bg px-3.5 py-2.5 text-[13px] font-semibold text-danger-fg">
              {editError}
            </div>
          )}
          <div className="mt-2 flex justify-end gap-3 border-t border-divider pt-5">
            <Button type="button" variant="secondary" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primarySmall" className="px-6" disabled={!editName || updateReport.isPending}>
              {updateReport.isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
