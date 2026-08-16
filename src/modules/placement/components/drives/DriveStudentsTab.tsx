"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Button, Select, Input, Badge, DataTable, ConfirmDialog, useToast, type DataTableColumn } from "@/modules/admin/components/ui";
import { downloadCsv } from "@/lib/utils/csv";
import { friendlyError } from "@/lib/utils/errors";
import { useApplications, useRemoveApplication, useUpdateApplicationStatus, type DriveApplication } from "@/modules/placement/api/applications";
import { applicationStageLabel } from "@/modules/placement/lib/format";
import type { ApplicationStatus } from "@/modules/placement/api/types";
import { AddApplicationModal } from "@/modules/placement/components/drives/AddApplicationModal";
import { ImportApplicationsModal } from "@/modules/placement/components/drives/ImportApplicationsModal";

interface DriveStudentsTabProps {
  driveId: number;
  companyName: string;
}

const STATUS_OPTIONS: { value: ApplicationStatus; label: string }[] = [
  { value: "applied", label: "Applied" },
  { value: "r1_cleared", label: "R1 cleared" },
  { value: "r2_cleared", label: "R2 cleared" },
  { value: "r3_cleared", label: "R3 cleared" },
  { value: "placed", label: "Selected" },
  { value: "rejected", label: "Rejected" },
];

const STAGE_TONE: Record<string, "neutral" | "primary" | "warning" | "success" | "danger"> = {
  Applied: "neutral",
  Shortlisted: "primary",
  "In process": "warning",
  Selected: "success",
  Rejected: "danger",
};

/** Student list tab — add (typeahead), bulk import (CSV/Excel), per-row status update and remove, all wired to the real per-drive application endpoints. */
export function DriveStudentsTab({ driveId, companyName }: DriveStudentsTabProps) {
  const { show } = useToast();
  const { data, isLoading, error } = useApplications(driveId);
  const updateStatus = useUpdateApplicationStatus(driveId);
  const removeApplication = useRemoveApplication(driveId);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<DriveApplication | null>(null);

  const rows = useMemo(() => data ?? [], [data]);
  const alreadyAppliedIds = useMemo(() => new Set(rows.map((a) => a.studentId)), [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((a) => {
      const matchesQuery =
        !q ||
        (a.studentName ?? "").toLowerCase().includes(q) ||
        a.studentIdNo.toLowerCase().includes(q) ||
        (a.rollNo ?? "").toLowerCase().includes(q);
      const matchesStatus = !statusFilter || a.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [rows, query, statusFilter]);

  function handleStatusChange(studentId: number, status: ApplicationStatus) {
    updateStatus.mutate(
      { studentId, status },
      {
        onSuccess: () => show("Application status updated.", "success"),
        onError: (err: unknown) => show(friendlyError(err), "error"),
      },
    );
  }

  function handleRemoveConfirm() {
    if (!removeTarget) return;
    removeApplication.mutate(removeTarget.studentId, {
      onSuccess: () => {
        show("Removed from drive.", "success");
        setRemoveTarget(null);
      },
      onError: (err: unknown) => show(friendlyError(err), "error"),
    });
  }

  function handleExport() {
    downloadCsv(
      `${companyName.replace(/\s+/g, "-").toLowerCase()}-candidates`,
      [
        { header: "Register number", value: (a: DriveApplication) => a.rollNo ?? a.studentIdNo },
        { header: "Student", value: (a: DriveApplication) => a.studentName ?? a.studentIdNo },
        { header: "Department", value: (a: DriveApplication) => a.departmentName ?? "—" },
        { header: "Status", value: (a: DriveApplication) => applicationStageLabel(a.status) },
      ],
      filtered,
    );
  }

  const columns: DataTableColumn<DriveApplication>[] = [
    {
      key: "student",
      header: "Student",
      render: (a) => (
        <div>
          <p className="font-semibold text-admin-ink">{a.studentName ?? a.studentIdNo}</p>
          <p className="text-xs text-admin-muted">{a.rollNo ?? a.studentIdNo}</p>
        </div>
      ),
    },
    { key: "class", header: "Class", render: (a) => a.classLabel ?? a.departmentName ?? "—" },
    {
      key: "status",
      header: "Status",
      render: (a) => (
        <Badge tone={STAGE_TONE[applicationStageLabel(a.status)] ?? "neutral"}>{applicationStageLabel(a.status)}</Badge>
      ),
    },
    {
      key: "update",
      header: "Update status",
      render: (a) => (
        <Select
          className="h-9 w-40 text-[13px]"
          value={a.status}
          onChange={(e) => handleStatusChange(a.studentId, e.target.value as ApplicationStatus)}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (a) => (
        <button
          type="button"
          onClick={() => setRemoveTarget(a)}
          className="rounded-admin-sm p-1.5 text-admin-muted hover:bg-admin-danger-bg hover:text-admin-danger"
          aria-label={`Remove ${a.studentName ?? a.studentIdNo}`}
        >
          <Icon name="person_remove" size={17} />
        </button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="min-w-[220px] flex-1">
          <Input leadingIcon="search" placeholder="Search name, roll no or ID" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        <Button variant="secondary" onClick={handleExport} disabled={filtered.length === 0}>
          <Icon name="download" size={16} /> Export
        </Button>
        <Button variant="secondary" onClick={() => setImportOpen(true)}>
          <Icon name="upload_file" size={16} /> Import
        </Button>
        <Button variant="primary" onClick={() => setAddOpen(true)}>
          <Icon name="person_add" size={16} /> Add student
        </Button>
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(a) => a.id}
        isLoading={isLoading}
        error={error ? friendlyError(error) : null}
        emptyTitle="No students on this drive yet"
        emptyDescription="Add a student or import a shortlist to get started."
        countLabel={`${filtered.length} student${filtered.length === 1 ? "" : "s"}`}
      />

      <AddApplicationModal open={addOpen} driveId={driveId} alreadyAppliedIds={alreadyAppliedIds} onClose={() => setAddOpen(false)} />
      <ImportApplicationsModal open={importOpen} driveId={driveId} onClose={() => setImportOpen(false)} />

      <ConfirmDialog
        open={removeTarget !== null}
        title="Remove from drive"
        message={`Remove ${removeTarget?.studentName ?? removeTarget?.studentIdNo} from this drive? This can't be undone.`}
        confirmLabel="Remove"
        destructive
        isConfirming={removeApplication.isPending}
        onConfirm={handleRemoveConfirm}
        onClose={() => setRemoveTarget(null)}
      />
    </div>
  );
}
