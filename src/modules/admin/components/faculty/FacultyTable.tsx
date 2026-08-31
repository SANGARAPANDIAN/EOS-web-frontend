"use client";

import type { ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { Badge, DataTable, type DataTableColumn } from "@/modules/admin/components/ui";
import { formatDate, formatFacultyCode, fullName } from "@/modules/admin/lib/faculty-format";
import { FacultyAvatar } from "@/modules/admin/components/faculty/FacultyAvatar";
import type { Faculty } from "@/modules/admin/api/faculty";

export type FacultySortDirection = "asc" | "desc";

interface FacultyTableProps {
  rows: Faculty[];
  isLoading?: boolean;
  error?: string | null;
  onView: (faculty: Faculty) => void;
  onEdit: (faculty: Faculty) => void;
  onRowClick?: (faculty: Faculty) => void;
  selectedIds: Set<number>;
  onToggleAll: () => void;
  onToggleOne: (id: number) => void;
  footer?: ReactNode;
  /** Keys from FACULTY_LIST_COLUMNS — everything but "name"/"actions" is hideable, matching the old console. */
  hiddenColumns?: Set<string>;
}

export function FacultyTable({
  rows,
  isLoading,
  error,
  onView,
  onEdit,
  onRowClick,
  selectedIds,
  onToggleAll,
  onToggleOne,
  footer,
  hiddenColumns,
}: FacultyTableProps) {
  const selectedOnPage = rows.filter((row) => selectedIds.has(row.id)).length;
  const allSelected = rows.length > 0 && selectedOnPage === rows.length;
  const someSelected = selectedOnPage > 0 && !allSelected;

  const allColumns: DataTableColumn<Faculty>[] = [
    {
      key: "name",
      header: "Faculty Name",
      render: (row) => (
        <div className="flex items-center gap-3 text-left">
          <FacultyAvatar faculty={row} className="size-9 rounded-admin-pill text-xs" />
          <div>
            <p className="font-semibold text-admin-ink">{fullName(row)}</p>
            <p className="font-mono text-xs text-admin-muted">{formatFacultyCode(row.id)}</p>
          </div>
        </div>
      ),
    },
    { key: "designation", header: "Designation", render: (row) => row.designation },
    {
      key: "department",
      header: "Department",
      render: (row) => <Badge tone="neutral">{row.department?.code ?? row.department?.name ?? "—"}</Badge>,
    },
    { key: "email", header: "Email", render: (row) => row.email },
    {
      key: "date_of_joining",
      header: "Date of joining",
      render: (row) => formatDate(row.date_of_joining),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Badge tone={row.status === "active" ? "success" : "neutral"}>{row.status === "active" ? "Active" : "Inactive"}</Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (row) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => onView(row)}
            aria-label={`View ${fullName(row)}`}
            className="rounded-admin-sm p-1.5 text-admin-muted hover:bg-admin-tint-strong hover:text-admin-body"
          >
            <Icon name="visibility" size={17} />
          </button>
          <button
            type="button"
            onClick={() => onEdit(row)}
            aria-label={`Edit ${fullName(row)}`}
            className="rounded-admin-sm p-1.5 text-admin-muted hover:bg-admin-tint-strong hover:text-admin-body"
          >
            <Icon name="edit" size={17} />
          </button>
        </div>
      ),
    },
  ];

  const columns = hiddenColumns ? allColumns.filter((col) => !hiddenColumns.has(col.key)) : allColumns;

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(row) => row.id}
      onRowClick={onRowClick}
      isLoading={isLoading}
      error={error}
      emptyTitle="No faculty found"
      selection={{
        isSelected: (row) => selectedIds.has(row.id),
        onToggle: (row) => onToggleOne(row.id),
        onToggleAll,
        allSelected,
        someSelected,
      }}
      footer={footer}
    />
  );
}
