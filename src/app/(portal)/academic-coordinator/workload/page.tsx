"use client";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { useCoordinatorFacultyWorkload } from "@/modules/academic-coordinator/hooks/useFacultyQueries";
import { SUBJECT_COURSE_TYPE_LABELS, type FacultyAllocationRow } from "@/modules/academic-coordinator/types";
import { useAcademicYear } from "@/modules/academic-coordinator/context/AcademicYearContext";
import { useMemo } from "react";

function barColor(hours: number, cap: number): string {
  if (hours > cap) return "#dc2626";
  const pct = (hours / cap) * 100;
  if (pct > 85) return "#ca8a04";
  return "#1f4fd8";
}

export default function CoordinatorFacultyWorkloadPage() {
  const workload = useCoordinatorFacultyWorkload();
  const { batchId, selectedBatch } = useAcademicYear();

  const allocations = useMemo(
    () => (workload.data?.allocations ?? []).filter((a) => a.batchId === batchId),
    [workload.data, batchId],
  );
  const summary = workload.data?.summary ?? [];

  const columns: DataTableColumn<FacultyAllocationRow>[] = [
    { key: "code", header: "CODE", width: "0.9fr", render: (a) => <span className="font-bold text-primary">{a.subjectCode}</span> },
    { key: "course", header: "COURSE", width: "1.8fr", render: (a) => <span className="truncate">{a.subjectName}</span> },
    { key: "class", header: "CLASS", width: "0.8fr", render: (a) => <>{a.classLabel}</> },
    { key: "faculty", header: "FACULTY", width: "1.4fr", render: (a) => <>{a.facultyName}</> },
    {
      key: "type",
      header: "TYPE",
      width: "1fr",
      render: (a) => <span className="text-muted">{a.courseType ? SUBJECT_COURSE_TYPE_LABELS[a.courseType] : "—"}</span>,
    },
    { key: "hours", header: "HRS/WK", width: "0.8fr", render: (a) => <>{a.weeklyHours}</> },
    {
      key: "check",
      header: "CHECK",
      width: "0.9fr",
      render: (a) => <Badge tone={a.check === "Overload" ? "danger" : "accent"}>{a.check}</Badge>,
    },
  ];

  return (
    <div className="flex flex-col gap-4.5">
      <div>
        <h1 className="m-0 text-[26px] font-bold tracking-[-.02em] text-ink">Faculty Workload</h1>
        <p className="mt-1.5 text-[13px] text-muted">
          Course allocation for the {selectedBatch ? `${selectedBatch.start_year}-${selectedBatch.end_year}` : "selected"} batch.
        </p>
      </div>

      <div>
        <h2 className="m-0 text-[16.5px] font-bold text-ink">Course allocation</h2>
        <p className="mt-1 text-[12px] text-muted">Real faculty-subject-class assignments, with weekly hours drawn from the published timetable.</p>
      </div>

      <DataTable
        columns={columns}
        data={allocations}
        rowKey={(a) => a.mappingId}
        loading={workload.isLoading}
        emptyMessage="No course allocations recorded yet."
      />

      <Card>
        <h2 className="m-0 text-[16.5px] font-bold text-ink">Workload summary</h2>
        <p className="mt-1 text-[12px] text-muted">
          Each faculty member&apos;s total weekly teaching hours across all batches — not limited to the batch selected above.
        </p>
        <div className="mt-4 flex flex-col gap-3.5">
          {summary.length === 0 ? (
            <EmptyState message="No scheduled teaching hours recorded yet." />
          ) : (
            summary.map((s) => (
              <div key={s.facultyId}>
                <div className="mb-1.5 flex justify-between text-[12.5px]">
                  <span className="font-semibold text-ink">{s.facultyName}</span>
                  <span className="text-muted">
                    {s.weeklyHours} / {s.weeklyLoadCapHours} hrs
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded bg-surface-tint">
                  <div className="h-full" style={{ width: `${s.percent}%`, background: barColor(s.weeklyHours, s.weeklyLoadCapHours) }} />
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
