"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useDepartments } from "@/modules/academic-structure/hooks/useAcademicStructureQueries";
import { useSubjects } from "@/modules/academic-coordinator/hooks/useSubjectsQueries";
import { SUBJECT_COURSE_TYPE_LABELS } from "@/modules/academic-coordinator/types";
import type { Subject } from "@/modules/academic-coordinator/types";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";

export default function AcademicCoordinatorDashboardPage() {
  const router = useRouter();
  const departments = useDepartments();
  const subjects = useSubjects();

  const deptCodeById = useMemo(() => new Map((departments.data ?? []).map((d) => [d.id, d.code])), [departments.data]);

  const totalCourses = subjects.data?.length ?? 0;
  const totalDepartments = useMemo(
    () => new Set((subjects.data ?? []).map((s) => s.departmentId).filter((id): id is number => id != null)).size,
    [subjects.data],
  );
  const totalCredits = useMemo(() => (subjects.data ?? []).reduce((sum, s) => sum + (s.credits ?? 0), 0), [subjects.data]);
  const recentCount = Math.min(totalCourses, 5);

  const recentRows = useMemo(
    () => [...(subjects.data ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
    [subjects.data],
  );

  const columns: DataTableColumn<Subject>[] = [
    { key: "code", header: "CODE", width: "1.4fr", render: (s) => <span className="font-bold text-primary">{s.subjectCode}</span> },
    { key: "name", header: "SUBJECT", width: "2.2fr", render: (s) => s.name },
    { key: "credits", header: "CREDITS", width: "0.8fr", render: (s) => s.credits ?? "—" },
    {
      key: "type",
      header: "TYPE",
      width: "1.4fr",
      render: (s) => <span className="text-muted">{s.courseType ? SUBJECT_COURSE_TYPE_LABELS[s.courseType] : "—"}</span>,
    },
    {
      key: "department",
      header: "DEPARTMENT",
      width: "1fr",
      render: (s) => <span className="text-muted">{s.departmentId != null ? (deptCodeById.get(s.departmentId) ?? "—") : "—"}</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-4.5">
      <div className="flex flex-wrap items-center justify-between gap-3.5">
        <span className="text-[11px] font-bold tracking-[.09em] text-subtle">QUICK ACTIONS</span>
        <div className="flex flex-wrap gap-2.5">
          <Button variant="secondary" onClick={() => router.push("/academic-coordinator/create")}>
            Create a course
          </Button>
          <Button variant="secondary" onClick={() => router.push("/academic-coordinator/map")}>
            Map outcomes
          </Button>
          <Button variant="secondary" onClick={() => router.push("/academic-coordinator/feedback")}>
            Collect feedback
          </Button>
          <Button variant="secondary" onClick={() => router.push("/academic-coordinator/academic-calendar")}>
            Open calendar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-3.5">
        <StatCard label="Total courses" value={totalCourses} icon="menu_book" href="/academic-coordinator/create" />
        <StatCard label="Total departments" value={totalDepartments} icon="layers" href="/academic-coordinator/structure" />
        <StatCard label="Total credits" value={totalCredits} icon="military_tech" />
        <StatCard label="Recently added courses" value={recentCount} icon="schedule" href="/academic-coordinator/create" />
      </div>

      <DataTable
        title={
          <div className="flex items-center gap-2.5">
            <h2 className="text-[15px] font-extrabold text-ink">Recently added courses</h2>
            <Badge>{totalCourses} total</Badge>
          </div>
        }
        titleNote={
          <Button variant="text" onClick={() => router.push("/academic-coordinator/create")}>
            Open course register →
          </Button>
        }
        columns={columns}
        data={recentRows}
        rowKey={(s) => s.id}
        loading={subjects.isLoading}
        emptyMessage="No courses in the register yet."
      />
    </div>
  );
}
