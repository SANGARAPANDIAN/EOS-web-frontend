"use client";

import { useState } from "react";
import { Card, Select, SkeletonTable } from "@/components/ui";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import {
  useHodAssignFaculty,
  useSetHandlingFaculty,
  useSetSubstituteFaculty,
  type HodAssignFacultyRow,
} from "@/modules/hod/api/assignFaculty";

// Same green/amber hex convention used everywhere else in the HOD module
// (class-records, placements, higher-education) for a status pill.
const STATUS_TONE_CLASS: Record<HodAssignFacultyRow["status"], string> = {
  assigned: "text-[#15803d] bg-[#effaf3] border border-[#cdeed9]",
  unassigned: "text-[#92400e] bg-[#fef7ec] border border-[#f6e2c3]",
};

function StatusPill({ status }: { status: HodAssignFacultyRow["status"] }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-pill border px-[9px] py-1 text-[10.5px] font-extrabold tracking-[.06em] ${STATUS_TONE_CLASS[status]}`}
    >
      {status === "assigned" ? "Assigned" : "Unassigned"}
    </span>
  );
}

export default function HodAssignFacultyPage() {
  const [classId, setClassId] = useState<number | null>(null);
  const overview = useHodAssignFaculty(classId);
  const setHandlingFaculty = useSetHandlingFaculty();
  const setSubstituteFaculty = useSetSubstituteFaculty();
  const o = overview.data;
  const rows = o?.rows ?? [];
  const selectedClassId = classId ?? o?.selected_class_id ?? null;
  const selectedClassLabel = o?.classes.find((c) => c.class_id === selectedClassId)?.short_label ?? null;

  const columns: DataTableColumn<HodAssignFacultyRow>[] = [
    {
      key: "class",
      header: "Class",
      width: "70px",
      render: () => <span className="text-[13.5px] font-bold text-ink">{selectedClassLabel ?? "—"}</span>,
    },
    {
      key: "subject",
      header: "Subject",
      width: "1.6fr",
      render: (r) => (
        <div className="min-w-0">
          <div className="truncate text-[13.5px] font-bold text-ink">{r.subject_name}</div>
          <div className="truncate text-[11.5px] text-subtle">{r.subject_code}</div>
        </div>
      ),
    },
    {
      key: "handling_faculty",
      header: "Handling faculty",
      width: "1.15fr",
      render: (r) => (
        <Select
          value={r.handling_faculty_id ?? ""}
          disabled={selectedClassId == null || setHandlingFaculty.isPending}
          onChange={(e) => {
            if (!e.target.value || selectedClassId == null) return;
            setHandlingFaculty.mutate({
              class_id: selectedClassId,
              subject_id: r.subject_id,
              faculty_id: Number(e.target.value),
            });
          }}
          className="font-bold"
        >
          <option value="" disabled>
            Select faculty
          </option>
          {(o?.faculty_options ?? []).map((f) => (
            <option key={f.faculty_id} value={f.faculty_id}>
              {f.name}
            </option>
          ))}
        </Select>
      ),
    },
    {
      key: "substitute_faculty",
      header: "Substitute faculty",
      width: "1.15fr",
      render: (r) => (
        <Select
          value={r.substitute_faculty_id ?? ""}
          disabled={selectedClassId == null || r.status === "unassigned" || setSubstituteFaculty.isPending}
          onChange={(e) => {
            if (selectedClassId == null) return;
            setSubstituteFaculty.mutate({
              class_id: selectedClassId,
              subject_id: r.subject_id,
              faculty_id: e.target.value ? Number(e.target.value) : null,
            });
          }}
          className="font-bold"
        >
          <option value="">Not allotted</option>
          {(o?.faculty_options ?? []).map((f) => (
            <option key={f.faculty_id} value={f.faculty_id}>
              {f.name}
            </option>
          ))}
        </Select>
      ),
    },
    {
      key: "hours",
      header: "Hours / wk",
      width: "100px",
      align: "right",
      render: (r) => <span className="text-[13.5px] font-bold text-ink">{r.hours_per_week ?? "—"}</span>,
    },
    {
      key: "status",
      header: "Status",
      width: "110px",
      render: (r) => <StatusPill status={r.status} />,
    },
  ];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      {overview.isError && (
        <div className="rounded-[11px] border border-danger-border bg-danger-bg px-4 py-2.5 text-[13px] font-semibold text-danger-fg">
          Couldn&apos;t load assign-faculty data — please try again.
        </div>
      )}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-[#080000]">Assign Faculty</h1>
          <p className="mt-1 text-[13px] text-muted">Map subjects to handling faculty and allot a substitute for the odd semester</p>
        </div>
        <Select
          value={selectedClassId ?? ""}
          onChange={(e) => setClassId(e.target.value ? Number(e.target.value) : null)}
          className="max-w-[260px] shrink-0 font-bold"
        >
          {(o?.classes ?? []).map((c) => (
            <option key={c.class_id} value={c.class_id}>
              {c.label}
            </option>
          ))}
        </Select>
      </div>

      {overview.isLoading ? (
        <SkeletonTable rows={8} />
      ) : overview.isError ? null : (
        <DataTable
          columns={columns}
          data={rows}
          rowKey={(r) => r.subject_id}
          rowClassName="hod-hover-row"
          emptyMessage="No subjects mapped to this class for the current semester."
        />
      )}

      {!overview.isLoading && !overview.isError && rows.length === 0 && !o?.classes.length && (
        <Card>
          <p className="text-[13px] text-muted">No classes found in your department.</p>
        </Card>
      )}
    </div>
  );
}
