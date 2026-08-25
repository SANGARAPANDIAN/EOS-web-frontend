"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { DataTable, EmptyState, type DataTableColumn } from "@/components/ui";
import { StatTile } from "@/modules/iqac/components/PageControls";
import { useRecruiterStudents, type RecruiterStudentRow } from "@/modules/iqac/api/studentDevelopment";
import { AddPlacementEntryModal } from "@/modules/iqac/components/studentDevelopment/AddPlacementEntryModal";

const STATUS_LABEL: Record<string, string> = {
  applied: "Applied",
  r1_cleared: "Round 1 cleared",
  r2_cleared: "Round 2 cleared",
  r3_cleared: "Round 3 cleared",
  rejected: "Rejected",
  placed: "Placed",
};

export default function RecruiterStudentsPage() {
  const params = useParams<{ companyId: string }>();
  const router = useRouter();
  const companyId = Number(params.companyId);
  const drilldown = useRecruiterStudents(Number.isFinite(companyId) ? companyId : null);
  const [addingEntry, setAddingEntry] = useState(false);

  const students = drilldown.data?.students ?? [];
  const departments = new Set(students.map((s) => s.department_code).filter(Boolean));
  const packages = students.map((s) => s.package).filter((v): v is number => v != null);
  const avgPackage = packages.length > 0 ? Math.round((packages.reduce((a, b) => a + b, 0) / packages.length) * 100) / 100 : null;

  const columns = useMemo<DataTableColumn<RecruiterStudentRow>[]>(
    () => [
      {
        key: "student",
        header: "Student",
        width: "1.4fr",
        sortValue: (r) => r.name,
        render: (r) => (
          <div>
            <div className="font-bold text-ink">{r.name}</div>
            <div className="text-[12px] text-subtle">{r.roll_no ?? r.register_no ?? "—"}</div>
          </div>
        ),
      },
      { key: "dept", header: "Dept", sortValue: (r) => r.department_code ?? "", render: (r) => r.department_code ?? "—" },
      { key: "sem", header: "Sem", sortValue: (r) => r.semester ?? -1, render: (r) => r.semester ?? "—" },
      { key: "role", header: "Role", sortValue: (r) => r.job_role ?? "", render: (r) => r.job_role ?? "—" },
      { key: "package", header: "Package", align: "right", sortValue: (r) => r.package ?? -1, render: (r) => (r.package != null ? `₹${r.package} LPA` : "—") },
      { key: "offer_response", header: "Offer response", sortValue: (r) => r.offer_response ?? "", render: (r) => r.offer_response ?? "Not recorded" },
      { key: "status", header: "Status", sortValue: (r) => STATUS_LABEL[r.status] ?? r.status, render: (r) => STATUS_LABEL[r.status] ?? r.status },
      { key: "updated_at", header: "Last updated", sortValue: (r) => r.updated_at, render: (r) => r.updated_at },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => router.push("/iqac/quality/student/placements")}
          className="w-fit h-10 rounded-[9px] border border-border-default bg-surface px-4 text-[13px] font-bold text-ink hover:bg-surface-tint"
        >
          ← Placements
        </button>
        {drilldown.data && (
          <button
            type="button"
            onClick={() => setAddingEntry(true)}
            className="hover-lift h-10 shrink-0 rounded-[9px] border border-primary-border bg-primary px-4 text-[13px] font-bold text-white"
          >
            + Add student entry
          </button>
        )}
      </div>

      {addingEntry && drilldown.data && (
        <AddPlacementEntryModal
          companyId={companyId}
          companyName={drilldown.data.company_name}
          onClose={() => setAddingEntry(false)}
          onCreated={() => drilldown.refetch()}
        />
      )}

      {drilldown.isLoading && (
        <div className="rounded-card border border-border-default bg-surface p-5">
          <EmptyState loading />
        </div>
      )}

      {drilldown.data && (
        <>
          <div>
            <h1 className="text-[34px] font-extrabold tracking-[-.02em] text-ink">{drilldown.data.company_name}</h1>
            <p className="mt-1 text-[15px] font-medium text-muted">Every real placed student for this recruiter · Student Development · Placements</p>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatTile label="Placed students" value={students.length} sub="matching this recruiter" />
            <StatTile label="Departments" value={departments.size} sub="represented" />
            <StatTile label="Average package" value={avgPackage != null ? `₹${avgPackage} LPA` : "—"} />
            <StatTile label="Roles offered" value={new Set(students.map((s) => s.job_role).filter(Boolean)).size} />
          </div>

          <DataTable columns={columns} data={students} rowKey={(r) => r.student_id} emptyMessage="No placed students found for this recruiter." hoverableRows />
        </>
      )}
    </div>
  );
}
