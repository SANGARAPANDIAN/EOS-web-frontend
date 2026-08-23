"use client";

import { useMemo, useState } from "react";
import { useClasses, useDepartments } from "@/modules/academic-structure/hooks/useAcademicStructureQueries";
import { useClassAttendance } from "@/modules/academic-coordinator/hooks/useAttendanceQueries";
import { useAcademicYear } from "@/modules/academic-coordinator/context/AcademicYearContext";
import { StatCard } from "@/components/ui/StatCard";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import type { AttendanceRow } from "@/modules/academic-coordinator/types";

export default function CoordinatorAttendancePage() {
  const departments = useDepartments();
  const classes = useClasses();
  const { batchId } = useAcademicYear();
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [classId, setClassId] = useState<number | null>(null);

  const deptCodeById = useMemo(() => new Map((departments.data ?? []).map((d) => [d.id, d.code])), [departments.data]);
  const classesInBatch = useMemo(() => (classes.data ?? []).filter((c) => c.batch_id === batchId), [classes.data, batchId]);
  const effectiveDeptId = departmentId ?? classesInBatch[0]?.department_id ?? departments.data?.[0]?.id ?? null;
  const classesInDept = useMemo(
    () => classesInBatch.filter((c) => c.department_id === effectiveDeptId).sort((a, b) => a.section.localeCompare(b.section)),
    [classesInBatch, effectiveDeptId],
  );
  const effectiveClassId = classesInDept.some((c) => c.id === classId) ? classId : (classesInDept[0]?.id ?? null);
  const attendance = useClassAttendance(effectiveClassId);

  const rows = attendance.data?.rows ?? [];
  const subjects = attendance.data?.subjects ?? [];
  const withOverall = rows.filter((r) => r.overallPercentage != null);
  const avgAttendance = withOverall.length
    ? Math.round(withOverall.reduce((sum, r) => sum + (r.overallPercentage ?? 0), 0) / withOverall.length)
    : null;
  const belowMinimum = rows.filter((r) => r.status === "Shortage").length;

  const columns: DataTableColumn<AttendanceRow>[] = [
    {
      key: "roll",
      header: "ROLL NO",
      width: "1fr",
      render: (r) => <span className="font-mono text-[12.5px]">{r.student.rollNo ?? r.student.studentIdNo}</span>,
    },
    { key: "name", header: "STUDENT", width: "1.6fr", render: (r) => <span className="font-bold text-ink">{r.student.name}</span> },
    ...subjects.map((s) => ({
      key: `subject-${s.id}`,
      header: <span title={s.name}>{s.subjectCode}</span>,
      width: "0.8fr",
      render: (r: AttendanceRow) => (
        <span className="text-muted">{r.subjectPercentages[s.id] != null ? `${r.subjectPercentages[s.id]}%` : "—"}</span>
      ),
    })),
    {
      key: "overall",
      header: "OVERALL",
      width: "0.8fr",
      render: (r) => (
        <span className={r.overallPercentage != null && r.overallPercentage < 75 ? "font-bold text-danger-fg" : "font-bold text-primary-dark"}>
          {r.overallPercentage != null ? `${r.overallPercentage}%` : "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "STATUS",
      width: "0.9fr",
      render: (r) => <Badge tone={r.status === "Shortage" ? "danger" : "accent"}>{r.status}</Badge>,
    },
  ];

  return (
    <div className="flex flex-col gap-4.5">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="m-0 text-[26px] font-bold tracking-[-.02em] text-ink">Attendance Management</h1>
          <p className="mt-1.5 text-[13px] text-muted">Class, subject and student attendance.</p>
        </div>
        <div className="flex gap-2.5">
          <Select
            value={effectiveDeptId ?? ""}
            onChange={(e) => {
              setDepartmentId(Number(e.target.value));
              setClassId(null);
            }}
            className="min-w-35"
          >
            {[...new Set(classesInBatch.map((c) => c.department_id))].map((deptId) => (
              <option key={deptId} value={deptId}>
                {deptCodeById.get(deptId) ?? "?"}
              </option>
            ))}
          </Select>
          <Select value={effectiveClassId ?? ""} onChange={(e) => setClassId(Number(e.target.value))} className="min-w-35">
            {classesInDept.length === 0 ? (
              <option value="">No sections</option>
            ) : (
              classesInDept.map((c) => (
                <option key={c.id} value={c.id}>
                  Section {c.section}
                </option>
              ))
            )}
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
        <StatCard label="Total students" value={rows.length} />
        <StatCard label="Average attendance" value={avgAttendance != null ? `${avgAttendance}%` : "—"} />
        <StatCard label="Below minimum (75%)" value={belowMinimum} />
      </div>

      <DataTable
        title="Student attendance"
        columns={columns}
        data={rows}
        rowKey={(r) => r.student.id}
        loading={attendance.isLoading}
        emptyMessage="No active students in this class."
      />
    </div>
  );
}
