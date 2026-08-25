"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { DataTable, EmptyState, type DataTableColumn } from "@/components/ui";
import { useDepartmentDetail, useDepartmentSections, type DepartmentSectionRow } from "@/modules/iqac/api/departments";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">{label}</div>
      <div className="mt-1 text-[15px] font-bold text-ink">{value}</div>
    </div>
  );
}

export default function DepartmentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = Number(params.id);
  const detail = useDepartmentDetail(id);
  const sections = useDepartmentSections(id);

  const columns = useMemo<DataTableColumn<DepartmentSectionRow>[]>(
    () => [
      { key: "section", header: "Section", render: (r) => [r.semester ? `Sem ${r.semester}` : null, r.section].filter(Boolean).join(" · ") },
      { key: "advisor", header: "Class Advisor", render: (r) => r.advisor?.name ?? "Not assigned" },
      { key: "students", header: "Students", align: "right", render: (r) => r.total_students },
      {
        key: "student_attendance",
        header: "Student attendance",
        align: "right",
        render: (r) => (r.student_attendance_percentage != null ? `${r.student_attendance_percentage}%` : "—"),
      },
      {
        key: "advisor_attendance",
        header: "Advisor attendance",
        align: "right",
        render: (r) => (r.faculty_attendance_percentage != null ? `${r.faculty_attendance_percentage}%` : "—"),
      },
      { key: "placed", header: "Placed", align: "right", render: (r) => r.placed },
      { key: "fees", header: "Fees pending", align: "right", render: (r) => (r.fees_pending_amount > 0 ? `₹${r.fees_pending_amount.toLocaleString("en-IN")}` : "—") },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <button type="button" onClick={() => router.push("/iqac/departments")} className="w-fit text-[13px] font-bold text-primary hover:underline">
        ← Back to departments
      </button>

      {detail.isLoading && (
        <div className="rounded-card border border-border-default bg-surface p-5">
          <EmptyState loading />
        </div>
      )}

      {detail.data && (
        <>
          <div>
            <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">{detail.data.name}</h1>
            <p className="mt-1 text-[13.5px] text-muted">
              {detail.data.code} · HoD: {detail.data.hod?.name ?? "Not assigned"}
            </p>
          </div>

          <div className="grid grid-cols-4 gap-5 rounded-card border border-border-default bg-surface p-6">
            <Field label="Students" value={detail.data.students_count} />
            <Field label="Faculty" value={detail.data.faculty_count} />
            <Field label="Sections" value={detail.data.students.sections_count} />
            <Field label="Mean CGPA" value="—" />
            <Field label="Student attendance" value={detail.data.students.attendance_percentage != null ? `${detail.data.students.attendance_percentage}%` : "—"} />
            <Field
              label="Faculty reporting today"
              value={detail.data.faculty.reporting_rate_today != null ? `${detail.data.faculty.reporting_rate_today}%` : "—"}
            />
            <Field label="Faculty on leave today" value={detail.data.faculty.on_leave_today} />
            <Field
              label="Placement"
              value={
                detail.data.placement.percentage != null
                  ? `${detail.data.placement.placed} placed · ${detail.data.placement.percentage}%`
                  : "—"
              }
            />
          </div>

          <DataTable
            title="Sections"
            columns={columns}
            data={sections.data ?? []}
            rowKey={(r) => r.id}
            loading={sections.isLoading}
            emptyMessage="No sections found for this department."
            hoverableRows
          />
        </>
      )}
    </div>
  );
}
