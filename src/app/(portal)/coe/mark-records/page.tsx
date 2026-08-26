"use client";

import { useMemo, useState } from "react";
import { Card, Select, Button } from "@/components/ui";
import { CoePageHeader } from "@/modules/coe/PageHeader";
import { SkeletonBlock, SkeletonFilterBar } from "@/components/ui/Skeleton";
import { useExams } from "@/modules/coe/api/exams";
import { useExamTypes, useDepartments, useClasses, useBatches } from "@/modules/coe/api/reference";
import { useGradeMatrix } from "@/modules/coe/api/marksRoster";
import { downloadCsv, type CsvColumn } from "@/lib/utils/csv";

export default function CoeMarkRecordsPage() {
  const exams = useExams();
  const examTypes = useExamTypes();
  const departments = useDepartments();
  const classes = useClasses();
  const batches = useBatches();

  // Design's first filter/summary label ("2022-2026") is a batch label
  // (batches.name — the student cohort), not exams.academic_year (the exam
  // session, "2026-2027") — a real, distinct field already used the same
  // way on Timetables' "New exam" form. Cascade now resolves the exam by
  // real batch_id + semester + exam_type_id instead of academic_year.
  const [batchId, setBatchId] = useState<number | null>(null);
  const [semester, setSemester] = useState<number | null>(null);
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [section, setSection] = useState<string | "all">("all");
  const [examTypeId, setExamTypeId] = useState<number | null>(null);

  const examTypesById = useMemo(() => new Map((examTypes.data ?? []).map((t) => [t.id, t])), [examTypes.data]);
  const batchesById = useMemo(() => new Map((batches.data ?? []).map((b) => [b.id, b])), [batches.data]);
  const batchIdsWithExams = useMemo(() => [...new Set((exams.data ?? []).map((e) => e.batch_id))], [exams.data]);
  const batchOptions = useMemo(
    () => (batches.data ?? []).filter((b) => batchIdsWithExams.includes(b.id)),
    [batches.data, batchIdsWithExams],
  );
  const effectiveBatchId = batchId ?? batchOptions[0]?.id ?? null;

  const semestersForBatch = useMemo(
    () => [...new Set((exams.data ?? []).filter((e) => e.batch_id === effectiveBatchId).map((e) => e.semester))].sort((a, b) => a - b),
    [exams.data, effectiveBatchId],
  );
  const effectiveSemester = semester ?? semestersForBatch[0] ?? null;

  const examTypeOptions = useMemo(
    () => [
      ...new Set(
        (exams.data ?? [])
          .filter((e) => e.batch_id === effectiveBatchId && e.semester === effectiveSemester)
          .map((e) => e.exam_type_id),
      ),
    ],
    [exams.data, effectiveBatchId, effectiveSemester],
  );
  const effectiveExamTypeId = examTypeId ?? examTypeOptions[0] ?? null;

  const resolvedExam = useMemo(() => {
    const candidates = (exams.data ?? []).filter(
      (e) => e.batch_id === effectiveBatchId && e.semester === effectiveSemester && e.exam_type_id === effectiveExamTypeId,
    );
    return candidates.sort((a, b) => b.id - a.id)[0] ?? null;
  }, [exams.data, effectiveBatchId, effectiveSemester, effectiveExamTypeId]);
  const effectiveExamId = resolvedExam?.id ?? null;
  const effectiveDepartmentId = departmentId ?? departments.data?.[0]?.id ?? null;

  const sectionsForScope = useMemo(() => {
    const rows = (classes.data ?? []).filter(
      (c) => c.current_semester === effectiveSemester && c.department_id === effectiveDepartmentId && c.batch_id === effectiveBatchId,
    );
    return [...new Set(rows.map((c) => c.section))].sort();
  }, [classes.data, effectiveSemester, effectiveDepartmentId, effectiveBatchId]);

  const filtersLoading = exams.isLoading || departments.isLoading || classes.isLoading || batches.isLoading;

  const gradeMatrix = useGradeMatrix({ exam_id: effectiveExamId, department_id: effectiveDepartmentId });

  const visibleStudents = useMemo(
    () => (gradeMatrix.data?.students ?? []).filter((s) => section === "all" || s.section === section),
    [gradeMatrix.data, section],
  );

  const departmentCode = useMemo(() => departments.data?.find((d) => d.id === effectiveDepartmentId)?.code ?? "", [departments.data, effectiveDepartmentId]);

  function handleDownloadExcel() {
    if (!gradeMatrix.data) return;
    const columns: CsvColumn<(typeof visibleStudents)[number]>[] = [
      { header: "Register no.", value: (s) => s.register_no },
      { header: "Candidate", value: (s) => s.name ?? "" },
      { header: "Dept", value: (s) => s.department_code },
      { header: "Sec", value: (s) => s.section },
      ...gradeMatrix.data.papers.map((p) => ({
        header: `${p.subject_code} · ${p.subject_name}`,
        value: (s: (typeof visibleStudents)[number]) => s.grades[p.subject_id] ?? "",
      })),
    ];
    downloadCsv(`mark-records-${departmentCode || "dept"}-sem${effectiveSemester ?? ""}`, columns, visibleStudents);
  }

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <CoePageHeader title="Mark records" subtitle="College-wide mark data across batches, semesters, departments and examinations" />

      {filtersLoading ? (
        <SkeletonFilterBar />
      ) : (
        <Card>
          <div className="grid grid-cols-5 gap-3">
            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-ink">Batch</label>
              <Select
                value={effectiveBatchId ?? ""}
                onChange={(e) => {
                  setBatchId(Number(e.target.value));
                  setSemester(null);
                  setExamTypeId(null);
                  setSection("all");
                }}
              >
                {batchOptions.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-ink">Department</label>
              <Select
                value={effectiveDepartmentId ?? ""}
                onChange={(e) => {
                  setDepartmentId(Number(e.target.value));
                  setSection("all");
                }}
              >
                {(departments.data ?? []).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code} · {d.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-ink">Semester</label>
              <Select
                value={effectiveSemester ?? ""}
                onChange={(e) => {
                  setSemester(Number(e.target.value));
                  setExamTypeId(null);
                  setSection("all");
                }}
              >
                {semestersForBatch.map((s) => (
                  <option key={s} value={s}>
                    Semester {s}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-ink">Section</label>
              <Select value={section} onChange={(e) => setSection(e.target.value)}>
                <option value="all">All sections</option>
                {sectionsForScope.map((s) => (
                  <option key={s} value={s}>
                    Section {s}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-ink">Examination type</label>
              <Select value={effectiveExamTypeId ?? ""} onChange={(e) => setExamTypeId(Number(e.target.value))}>
                {examTypeOptions.map((id) => (
                  <option key={id} value={id}>
                    {examTypesById.get(id)?.name ?? `Type #${id}`}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </Card>
      )}

      {!filtersLoading && (
        <div className="flex items-center justify-between gap-4">
          <span className="text-[13px] text-muted">
            {visibleStudents.length} candidates · {batchesById.get(effectiveBatchId ?? -1)?.name ?? "—"} · Semester {effectiveSemester ?? "—"} ·{" "}
            {departmentCode || "—"} · {section === "all" ? "All sections" : `Section ${section}`} ·{" "}
            {examTypesById.get(effectiveExamTypeId ?? -1)?.name ?? "—"}
          </span>
          <Button variant="secondary" className="w-auto px-3.5 py-1.5 text-[12.5px]" disabled={!gradeMatrix.data?.papers.length} onClick={handleDownloadExcel}>
            Download Excel
          </Button>
        </div>
      )}

      {gradeMatrix.isLoading ? (
        <SkeletonBlock />
      ) : gradeMatrix.isError ? (
        <Card className="border-danger-border bg-danger-bg">
          <p className="text-[13px] text-danger-fg">{(gradeMatrix.error as Error).message}</p>
        </Card>
      ) : !gradeMatrix.data || gradeMatrix.data.papers.length === 0 ? (
        <Card>
          <p className="text-[13px] text-subtle">No papers mapped for this department/exam selection yet.</p>
        </Card>
      ) : (
        <Card className="p-0">
          <div className="border-b border-divider px-5 py-3.5">
            <span className="text-[15px] font-extrabold text-ink">
              {departmentCode} · {visibleStudents.length} candidates · {gradeMatrix.data.papers.length} papers
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-divider text-left text-[11px] font-extrabold uppercase tracking-[.06em] text-subtle">
                  <th className="px-5 py-3">Register no.</th>
                  <th className="py-3">Candidate</th>
                  <th className="py-3">Dept</th>
                  <th className="py-3">Sec</th>
                  {gradeMatrix.data.papers.map((p) => (
                    <th key={p.subject_id} className="whitespace-nowrap py-3 pr-4 align-top normal-case">
                      <div className="text-[12.5px] font-extrabold text-ink">{p.subject_code}</div>
                      <div className="text-[11px] font-semibold text-subtle">{p.subject_name}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleStudents.map((s) => (
                  <tr key={s.student_id} className="border-b border-divider last:border-0">
                    <td className="px-5 py-3 text-[13px] font-bold text-primary">{s.register_no}</td>
                    <td className="py-3 text-[13.5px] text-ink">{s.name ?? "—"}</td>
                    <td className="py-3 text-[12.5px] text-muted">{s.department_code}</td>
                    <td className="py-3 text-[12.5px] text-muted">{s.section}</td>
                    {gradeMatrix.data!.papers.map((p) => {
                      const grade = s.grades[p.subject_id];
                      return (
                        <td key={p.subject_id} className={`py-3 pr-4 text-[13px] font-bold ${grade === "U" ? "text-danger-fg" : "text-ink"}`}>
                          {grade ?? "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
