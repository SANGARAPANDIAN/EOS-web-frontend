"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { principalColors } from "@/modules/principal/theme";
import { PrincipalStatCard } from "@/modules/principal/components/PrincipalStatCard";
import {
  useExamsSummary,
  useExamsFilters,
  useExamClasses,
  useExamSemesters,
  useExamsForBatchSemester,
  useExamResults,
} from "@/modules/principal/api/exams";

function gradeColor(grade: string | null): string {
  if (grade == null) return principalColors.textFaint;
  return grade === "U" ? "#B42318" : principalColors.heading;
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function PrincipalExamsPage() {
  const summary = useExamsSummary();
  const filters = useExamsFilters();

  const [batchId, setBatchId] = useState<number | null>(null);
  const [deptId, setDeptId] = useState<number | null>(null);
  const [semester, setSemester] = useState<number | null>(null);
  const [section, setSection] = useState<string | null>(null);
  const [examId, setExamId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const classes = useExamClasses(batchId);
  const semesters = useExamSemesters(batchId);
  const exams = useExamsForBatchSemester(batchId, semester);

  const departments = useMemo(() => {
    const map = new Map<number, { id: number; name: string; code: string }>();
    for (const c of classes.data ?? []) map.set(c.departments.id, c.departments);
    return Array.from(map.values());
  }, [classes.data]);

  const sections = useMemo(() => {
    if (!classes.data || deptId == null) return [];
    return Array.from(new Set(classes.data.filter((c) => c.departments.id === deptId).map((c) => c.section))).sort();
  }, [classes.data, deptId]);

  const classId = useMemo(() => {
    if (!classes.data || deptId == null || section == null) return null;
    return classes.data.find((c) => c.departments.id === deptId && c.section === section)?.id ?? null;
  }, [classes.data, deptId, section]);

  const results = useExamResults(examId, classId);

  const filteredRows = useMemo(() => {
    if (!results.data) return [];
    if (!search.trim()) return results.data.rows;
    const q = search.trim().toLowerCase();
    return results.data.rows.filter((r) => r.student_id_no.toLowerCase().includes(q) || r.name.toLowerCase().includes(q));
  }, [results.data, search]);

  function handleDownload() {
    if (!results.data) return;
    const header = ["Register No", "Candidate", "Dept", "Sec", ...results.data.subjects.map((s) => s.subject_code), "Average %"];
    const rows = filteredRows.map((r) => [
      r.student_id_no,
      r.name,
      results.data!.class?.department_code ?? "",
      results.data!.class?.section ?? "",
      ...r.cells.map((c) => (c.is_absent ? "Absent" : c.entered ? String(c.marks_obtained) : "—")),
      r.average_percentage != null ? `${r.average_percentage}%` : "—",
    ]);
    downloadCsv("exam-results.csv", [header, ...rows]);
  }

  function selectStyle() {
    return {
      borderColor: principalColors.border,
      background: principalColors.bg,
      color: principalColors.heading,
    };
  }

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div>
        <h1
          className="text-[34px] font-extrabold tracking-tight"
          style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}
        >
          Examinations &amp; results
        </h1>
        <p className="mt-1.5 text-[15px]" style={{ color: principalColors.textFaint }}>
          Real exam-attempt data, graded by percentage against the institution&apos;s real grade bands
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <PrincipalStatCard
          label="Pass percentage"
          icon="quiz"
          loading={summary.isLoading}
          value={summary.data?.pass_percentage != null ? `${summary.data.pass_percentage}%` : "—"}
          footer="across all real exam attempts"
        />
        <PrincipalStatCard
          label="Failing attempts"
          icon="report"
          loading={summary.isLoading}
          value={summary.data ? summary.data.failing_attempts.count.toLocaleString("en-IN") : "—"}
          footer={summary.data ? `${summary.data.failing_attempts.students.toLocaleString("en-IN")} students affected` : undefined}
        />
        <PrincipalStatCard
          label={`Grade ${summary.data?.high_scorers.grade_label ?? "O"} scorers`}
          icon="workspace_premium"
          loading={summary.isLoading}
          value={summary.data ? summary.data.high_scorers.students.toLocaleString("en-IN") : "—"}
          footer="students with at least one top-band attempt"
        />
        <PrincipalStatCard
          label="Revaluation requests"
          icon="rate_review"
          loading={summary.isLoading}
          value={summary.data ? summary.data.revaluation.total.toLocaleString("en-IN") : "—"}
          footer={summary.data ? `${summary.data.revaluation.pending.toLocaleString("en-IN")} pending review` : undefined}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 rounded-2xl border p-5 sm:grid-cols-3 lg:grid-cols-5" style={{ background: principalColors.bg, borderColor: principalColors.border }}>
        <div>
          <label className="mb-1 block text-xs font-semibold" style={{ color: principalColors.textFaint }}>
            Batch
          </label>
          <select
            className="h-10 w-full rounded-[9px] border px-2 text-sm outline-none"
            style={selectStyle()}
            value={batchId ?? ""}
            onChange={(e) => {
              const v = e.target.value ? Number(e.target.value) : null;
              setBatchId(v);
              setDeptId(null);
              setSection(null);
              setSemester(null);
              setExamId(null);
            }}
          >
            <option value="">Select batch</option>
            {filters.data?.batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold" style={{ color: principalColors.textFaint }}>
            Department
          </label>
          <select
            className="h-10 w-full rounded-[9px] border px-2 text-sm outline-none disabled:opacity-50"
            style={selectStyle()}
            value={deptId ?? ""}
            disabled={batchId == null}
            onChange={(e) => {
              setDeptId(e.target.value ? Number(e.target.value) : null);
              setSection(null);
            }}
          >
            <option value="">Select department</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.code}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold" style={{ color: principalColors.textFaint }}>
            Semester
          </label>
          <select
            className="h-10 w-full rounded-[9px] border px-2 text-sm outline-none disabled:opacity-50"
            style={selectStyle()}
            value={semester ?? ""}
            disabled={batchId == null}
            onChange={(e) => {
              setSemester(e.target.value ? Number(e.target.value) : null);
              setExamId(null);
            }}
          >
            <option value="">Select semester</option>
            {semesters.data?.map((s) => (
              <option key={s} value={s}>
                Semester {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold" style={{ color: principalColors.textFaint }}>
            Section
          </label>
          <select
            className="h-10 w-full rounded-[9px] border px-2 text-sm outline-none disabled:opacity-50"
            style={selectStyle()}
            value={section ?? ""}
            disabled={deptId == null}
            onChange={(e) => setSection(e.target.value || null)}
          >
            <option value="">Select section</option>
            {sections.map((s) => (
              <option key={s} value={s}>
                Section {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold" style={{ color: principalColors.textFaint }}>
            Examination
          </label>
          <select
            className="h-10 w-full rounded-[9px] border-2 px-2 text-sm font-semibold outline-none disabled:opacity-50"
            style={{ ...selectStyle(), borderColor: principalColors.primary }}
            value={examId ?? ""}
            disabled={semester == null}
            onChange={(e) => setExamId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Select exam</option>
            {exams.data?.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.exam_types.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {classId != null && examId != null && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-10 min-w-[260px] flex-1 items-center gap-2 rounded-[10px] border px-3" style={{ borderColor: principalColors.border, background: principalColors.surfaceMuted }}>
              <Icon name="search" size={16} style={{ color: principalColors.textFaint }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent text-sm outline-none"
                style={{ color: principalColors.heading }}
                placeholder="Search register number or candidate name"
              />
            </div>
            {results.data && (
              <span className="text-sm" style={{ color: principalColors.textFaint }}>
                {filteredRows.length} candidate{filteredRows.length === 1 ? "" : "s"} · {results.data.exam?.academic_year} · Semester {results.data.exam?.semester} ·{" "}
                {results.data.class?.department_code} · Section {results.data.class?.section} · {results.data.exam?.title}
              </span>
            )}
            <button
              type="button"
              onClick={handleDownload}
              disabled={!results.data}
              className="ml-auto flex h-10 items-center gap-2 rounded-[10px] border px-3 text-sm font-semibold disabled:opacity-50"
              style={{ borderColor: principalColors.border, color: principalColors.body }}
            >
              <Icon name="download" size={16} />
              Download CSV
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border hover-lift transition-all hover:-translate-y-[3px] hover:shadow-[0_10px_24px_rgba(13,30,79,0.14)]" style={{ background: principalColors.bg, borderColor: principalColors.border }}>
            {results.isLoading && (
              <div className="p-5">
                <Skeleton className="h-4 w-56" />
                <div className="mt-5 flex flex-col gap-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              </div>
            )}
            {results.data && (
              <>
                <div className="flex items-center gap-2 border-b px-5 py-3.5" style={{ borderColor: principalColors.borderLight }}>
                  <span className="text-[15px] font-bold" style={{ color: principalColors.heading }}>
                    {results.data.class?.department_code}
                  </span>
                  <span className="text-sm" style={{ color: principalColors.textFaint }}>
                    {results.data.candidate_count} candidates · {results.data.paper_count} papers
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: principalColors.surfaceMuted }}>
                        <th className="whitespace-nowrap px-4 py-2.5 text-left text-[11px] font-bold tracking-wider" style={{ color: principalColors.textFaint }}>
                          REGISTER NO.
                        </th>
                        <th className="whitespace-nowrap px-4 py-2.5 text-left text-[11px] font-bold tracking-wider" style={{ color: principalColors.textFaint }}>
                          CANDIDATE
                        </th>
                        <th className="whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-bold tracking-wider" style={{ color: principalColors.textFaint }}>
                          DEPT
                        </th>
                        <th className="whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-bold tracking-wider" style={{ color: principalColors.textFaint }}>
                          SEC
                        </th>
                        {results.data.subjects.map((s) => (
                          <th key={s.subject_code} className="whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-bold" style={{ color: principalColors.primary }}>
                            {s.subject_code}
                            <div className="mt-0.5 max-w-[110px] truncate text-[10px] font-medium normal-case" style={{ color: principalColors.textFaint }}>
                              {s.name}
                            </div>
                          </th>
                        ))}
                        <th className="whitespace-nowrap px-3 py-2.5 text-right text-[11px] font-bold tracking-wider" style={{ color: principalColors.textFaint }}>
                          AVERAGE
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.map((row) => (
                        <tr key={row.student_id_no} className="border-t transition-colors hover:bg-[#F1F6FE] hover:shadow-[inset_0_0_0_1.5px_#1D47AE]" style={{ borderColor: principalColors.borderMuted }}>
                          <td className="whitespace-nowrap px-4 py-3 font-semibold" style={{ color: principalColors.primary }}>
                            {row.student_id_no}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3" style={{ color: principalColors.heading }}>
                            {row.name}
                          </td>
                          <td className="px-3 py-3" style={{ color: principalColors.textFaint }}>
                            {results.data!.class?.department_code}
                          </td>
                          <td className="px-3 py-3" style={{ color: principalColors.textFaint }}>
                            {results.data!.class?.section}
                          </td>
                          {row.cells.map((cell, i) => (
                            <td key={i} className="px-3 py-3 tabular-nums" style={{ color: gradeColor(cell.grade), fontFamily: "var(--font-jetbrains-mono)" }}>
                              {cell.is_absent ? "Absent" : cell.entered ? cell.marks_obtained : "—"}
                            </td>
                          ))}
                          <td className="px-3 py-3 text-right font-semibold tabular-nums" style={{ color: principalColors.heading, fontFamily: "var(--font-jetbrains-mono)" }}>
                            {row.average_percentage != null ? `${row.average_percentage}%` : "—"}
                          </td>
                        </tr>
                      ))}
                      {filteredRows.length === 0 && (
                        <tr>
                          <td colSpan={5 + results.data.subjects.length} className="px-4 py-6 text-center" style={{ color: principalColors.textFaint }}>
                            No candidates match this search.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {(classId == null || examId == null) && (
        <div className="rounded-2xl border p-10 text-center" style={{ background: principalColors.surfaceMuted, borderColor: principalColors.borderLight }}>
          <p className="text-sm" style={{ color: principalColors.textFaint }}>
            Select a batch, department, semester, section and examination above to see real results.
          </p>
        </div>
      )}
    </div>
  );
}
