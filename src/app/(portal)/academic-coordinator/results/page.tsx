"use client";

import { useMemo, useState } from "react";
import { useClasses, useDepartments } from "@/modules/academic-structure/hooks/useAcademicStructureQueries";
import { useClassResults } from "@/modules/academic-coordinator/hooks/useResultsQueries";
import { useAcademicYear } from "@/modules/academic-coordinator/context/AcademicYearContext";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { NumberedPagination } from "@/modules/admin/components/ui/NumberedPagination";
import type { ResultsRow } from "@/modules/academic-coordinator/types";

const PAGE_SIZE = 15;

const STANDING_TONE: Record<ResultsRow["standing"], BadgeTone> = {
  "Top performer": "accentDark",
  "On track": "accent",
  "At risk": "danger",
  "No results yet": "neutral",
};

type SortKey = "name" | "cgpa";

export default function CoordinatorResultsPage() {
  const departments = useDepartments();
  const classes = useClasses();
  const { batchId } = useAcademicYear();
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [classId, setClassId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const deptCodeById = useMemo(() => new Map((departments.data ?? []).map((d) => [d.id, d.code])), [departments.data]);
  const classesInBatch = useMemo(() => (classes.data ?? []).filter((c) => c.batch_id === batchId), [classes.data, batchId]);
  const effectiveDeptId = departmentId ?? classesInBatch[0]?.department_id ?? departments.data?.[0]?.id ?? null;
  const classesInDept = useMemo(
    () => classesInBatch.filter((c) => c.department_id === effectiveDeptId).sort((a, b) => a.section.localeCompare(b.section)),
    [classesInBatch, effectiveDeptId],
  );
  const effectiveClassId = classesInDept.some((c) => c.id === classId) ? classId : (classesInDept[0]?.id ?? null);
  const results = useClassResults(effectiveClassId);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  }

  function sortableHeader(label: string, key: SortKey) {
    return (
      <button type="button" onClick={() => toggleSort(key)} className="flex items-center gap-1 uppercase">
        {label}
        {sortKey === key && <Icon name={sortDir === "asc" ? "arrow_upward" : "arrow_downward"} size={12} />}
      </button>
    );
  }

  const rows = useMemo(() => {
    const list = [...(results.data?.rows ?? [])];
    if (sortKey) {
      list.sort((a, b) => {
        const cmp = sortKey === "name" ? a.student.name.localeCompare(b.student.name) : (a.cgpa ?? -1) - (b.cgpa ?? -1);
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return list;
  }, [results.data?.rows, sortKey, sortDir]);
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const columns: DataTableColumn<ResultsRow>[] = [
    { key: "roll", header: "ROLL NO", width: "0.8fr", render: (r) => <span className="font-mono text-[12.5px]">{r.student.rollNo ?? "—"}</span> },
    { key: "name", header: sortableHeader("Student", "name"), width: "1.6fr", render: (r) => <span className="font-bold text-ink">{r.student.name}</span> },
    { key: "cgpa", header: sortableHeader("CGPA", "cgpa"), width: "0.8fr", render: (r) => <>{r.cgpa != null ? r.cgpa.toFixed(2) : "—"}</> },
    { key: "backlogs", header: "BACKLOGS", width: "0.8fr", render: (r) => <>{r.backlogs}</> },
    { key: "standing", header: "STANDING", width: "1fr", render: (r) => <Badge tone={STANDING_TONE[r.standing]}>{r.standing}</Badge> },
  ];

  return (
    <div className="flex flex-col gap-4.5">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="m-0 text-[26px] font-bold tracking-[-.02em] text-ink">Results and Performance</h1>
          <p className="mt-1.5 text-[13px] text-muted">Pass percentage, CGPA and at-risk students — computed live from published results.</p>
        </div>
        <div className="flex gap-2.5">
          <Select
            value={effectiveDeptId ?? ""}
            onChange={(e) => {
              setDepartmentId(Number(e.target.value));
              setClassId(null);
              setPage(1);
            }}
            className="min-w-35"
          >
            {[...new Set(classesInBatch.map((c) => c.department_id))].map((deptId) => (
              <option key={deptId} value={deptId}>
                {deptCodeById.get(deptId) ?? "?"}
              </option>
            ))}
          </Select>
          <Select
            value={effectiveClassId ?? ""}
            onChange={(e) => {
              setClassId(Number(e.target.value));
              setPage(1);
            }}
            className="min-w-35"
          >
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
        <StatCard
          label="Pass percentage"
          value={<span className="text-[#166534]">{results.data?.passPercentage != null ? `${results.data.passPercentage}%` : "—"}</span>}
        />
        <StatCard label="Class average" value={results.data?.classAverage ?? "—"} />
        <StatCard label="Highest mark" value={results.data?.highestMark ?? "—"} />
        <StatCard label="Lowest mark" value={<span className="text-[#991b1b]">{results.data?.lowestMark ?? "—"}</span>} />
        <StatCard
          label="Students with backlogs"
          value={<span className="text-[#991b1b]">{results.data?.studentsWithBacklogs ?? 0}</span>}
        />
      </div>

      <Card>
        <div className="mb-3.5 flex items-baseline justify-between">
          <h2 className="m-0 text-[15px] font-bold text-ink">Subject-wise pass percentage</h2>
          {(results.data?.subjects ?? []).length > 0 && <span className="text-[11px] text-subtle">Lowest first</span>}
        </div>
        {(results.data?.subjects ?? []).length === 0 ? (
          <p className="m-0 text-[12.5px] text-subtle">No published results for this class yet.</p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-2.5">
            {[...(results.data?.subjects ?? [])]
              .sort((a, b) => (a.passPercentage ?? -1) - (b.passPercentage ?? -1))
              .map((s) => {
                const pct = s.passPercentage ?? 0;
                const color = pct >= 85 ? "#16a34a" : pct >= 75 ? "#2563eb" : "#ca8a04";
                return (
                  <div key={s.subjectId} className="rounded-[10px] border border-divider px-3 py-2.5" title={s.subjectName}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xs font-bold text-primary">{s.subjectCode}</span>
                      <span className="text-[15px] font-bold" style={{ color }}>
                        {s.passPercentage != null ? `${s.passPercentage}%` : "—"}
                      </span>
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-muted">{s.subjectName}</div>
                    <div className="mt-2 h-[5px] overflow-hidden rounded-[3px] bg-surface-tint">
                      <div className="h-full rounded-[3px]" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </Card>

      <DataTable
        title="Student performance"
        columns={columns}
        data={pageRows}
        rowKey={(r) => r.student.id}
        loading={results.isLoading}
        emptyMessage="No students in this class."
      />
      <NumberedPagination page={page} pageSize={PAGE_SIZE} total={rows.length} onPageChange={setPage} />
    </div>
  );
}
