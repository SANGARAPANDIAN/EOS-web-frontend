"use client";

import { useMemo, useState } from "react";
import { Card, Select, Button } from "@/components/ui";
import { CoePageHeader } from "@/modules/coe/PageHeader";
import { SkeletonBlock, SkeletonFilterBar } from "@/components/ui/Skeleton";
import { useExams, useExamSubjectMappings } from "@/modules/coe/api/exams";
import { useExamTypes, useBatches, useClasses, useSubjects } from "@/modules/coe/api/reference";
import { useDepartments } from "@/modules/shared/api/departments";
import { useMarksRoster, useSetMarksEntryLock, type RosterEntry } from "@/modules/coe/api/marksRoster";
import { useCreateExamMark, useUpdateExamMark } from "@/modules/coe/api/marks";

const GRADE_BANDS = ["O", "A+", "A", "B+", "B", "U"];

function ExternalCell({
  entry,
  externalMax,
  locked,
  onSave,
}: {
  entry: RosterEntry;
  externalMax: number;
  locked: boolean;
  onSave: (value: number) => void;
}) {
  const initial = entry.external?.marks_obtained != null ? String(entry.external.marks_obtained) : "";
  const [value, setValue] = useState(initial);

  return (
    <div className="flex items-center gap-1.5">
      <input
        value={value}
        disabled={locked}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          const num = Number(value);
          if (value.trim() !== "" && Number.isFinite(num) && num >= 0 && num !== entry.external?.marks_obtained) {
            onSave(num);
          }
        }}
        placeholder="—"
        className="w-16 rounded-input border border-border-default bg-accent-50 px-2 py-1.5 text-center text-[13px] text-ink focus:border-border-accent focus:outline-none disabled:bg-surface-tint disabled:opacity-70"
      />
      <span className="text-[12px] text-subtle">out of {externalMax}</span>
    </div>
  );
}

export default function CoeMarksEntryPage() {
  const exams = useExams();
  const examTypes = useExamTypes();
  const batches = useBatches();
  const departments = useDepartments();
  const classes = useClasses();
  const subjects = useSubjects();
  const mappings = useExamSubjectMappings();

  const [academicYear, setAcademicYear] = useState<string | null>(null);
  const [semester, setSemester] = useState<number | null>(null);
  const [examTypeId, setExamTypeId] = useState<number | null>(null);
  const [batchId, setBatchId] = useState<number | null>(null);
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [section, setSection] = useState<string | null>(null);
  const [subjectId, setSubjectId] = useState<number | null>(null);

  const examTypesById = useMemo(() => new Map((examTypes.data ?? []).map((t) => [t.id, t])), [examTypes.data]);
  const subjectsById = useMemo(() => new Map((subjects.data ?? []).map((s) => [s.id, s])), [subjects.data]);

  const academicYears = useMemo(() => [...new Set((exams.data ?? []).map((e) => e.academic_year))].sort().reverse(), [exams.data]);
  const effectiveAcademicYear = academicYear ?? academicYears[0] ?? null;

  const semestersForYear = useMemo(
    () => [...new Set((exams.data ?? []).filter((e) => e.academic_year === effectiveAcademicYear).map((e) => e.semester))].sort((a, b) => a - b),
    [exams.data, effectiveAcademicYear],
  );
  const effectiveSemester = semester ?? semestersForYear[0] ?? null;

  const examTypeOptions = useMemo(
    () => [
      ...new Set(
        (exams.data ?? [])
          .filter((e) => e.academic_year === effectiveAcademicYear && e.semester === effectiveSemester)
          .map((e) => e.exam_type_id),
      ),
    ],
    [exams.data, effectiveAcademicYear, effectiveSemester],
  );
  const effectiveExamTypeId = examTypeId ?? examTypeOptions[0] ?? null;

  const resolvedExam = useMemo(
    () =>
      (exams.data ?? []).find(
        (e) => e.academic_year === effectiveAcademicYear && e.semester === effectiveSemester && e.exam_type_id === effectiveExamTypeId,
      ) ?? null,
    [exams.data, effectiveAcademicYear, effectiveSemester, effectiveExamTypeId],
  );
  const effectiveExamId = resolvedExam?.id ?? null;

  const classesForSemester = useMemo(
    () => (classes.data ?? []).filter((c) => c.current_semester === effectiveSemester),
    [classes.data, effectiveSemester],
  );
  const batchOptions = useMemo(() => {
    const ids = new Set(classesForSemester.map((c) => c.batch_id));
    return (batches.data ?? []).filter((b) => ids.has(b.id));
  }, [classesForSemester, batches.data]);
  const effectiveBatchId = batchId ?? batchOptions[0]?.id ?? null;

  const classesForBatch = useMemo(
    () => classesForSemester.filter((c) => c.batch_id === effectiveBatchId),
    [classesForSemester, effectiveBatchId],
  );
  const departmentOptions = useMemo(() => {
    const ids = new Set(classesForBatch.map((c) => c.department_id));
    return (departments.data ?? []).filter((d) => ids.has(d.id));
  }, [classesForBatch, departments.data]);
  const effectiveDepartmentId = departmentId ?? departmentOptions[0]?.id ?? null;

  const classesForDept = useMemo(
    () => classesForBatch.filter((c) => c.department_id === effectiveDepartmentId),
    [classesForBatch, effectiveDepartmentId],
  );
  const sectionOptions = useMemo(() => [...new Set(classesForDept.map((c) => c.section))].sort(), [classesForDept]);
  const effectiveSection = section ?? sectionOptions[0] ?? null;

  const resolvedClass = useMemo(() => classesForDept.find((c) => c.section === effectiveSection) ?? null, [classesForDept, effectiveSection]);

  const mappingsForClassExam = useMemo(
    () => (mappings.data ?? []).filter((m) => m.exam_id === effectiveExamId && m.class_id === resolvedClass?.id),
    [mappings.data, effectiveExamId, resolvedClass],
  );
  const effectiveSubjectMappingId = useMemo(() => {
    if (subjectId != null) {
      return mappingsForClassExam.find((m) => m.subject_id === subjectId)?.id ?? mappingsForClassExam[0]?.id ?? null;
    }
    return mappingsForClassExam[0]?.id ?? null;
  }, [mappingsForClassExam, subjectId]);

  const filtersLoading = exams.isLoading || batches.isLoading || departments.isLoading || classes.isLoading || subjects.isLoading;

  const roster = useMarksRoster(effectiveSubjectMappingId);
  const createMark = useCreateExamMark();
  const updateMark = useUpdateExamMark();
  const setLock = useSetMarksEntryLock();

  function handleSaveExternal(entry: RosterEntry, value: number) {
    if (!roster.data || !roster.data.pass_rules) return;
    const mapping = roster.data.mapping;
    if (entry.external) {
      updateMark.mutate({ id: entry.external.id, marks_obtained: value });
    } else {
      createMark.mutate({
        exam_subject_mapping_id: mapping.id,
        student_id: entry.student_id,
        marks_obtained: value,
        max_marks: roster.data.pass_rules.external_max_marks,
      });
    }
  }

  const stats = useMemo(() => {
    if (!roster.data) return null;
    const totals = roster.data.roster.map((r) => r.total).filter((t): t is number => t != null);
    const classAverage = totals.length ? totals.reduce((a, b) => a + b, 0) / totals.length : null;
    const highestTotal = totals.length ? Math.max(...totals) : null;
    const passMark = roster.data.pass_rules?.pass_mark_total ?? null;
    const passPercentage = totals.length && passMark != null ? (totals.filter((t) => t >= passMark).length / totals.length) * 100 : null;
    const gradeCounts = new Map<string, number>(GRADE_BANDS.map((g) => [g, 0]));
    for (const r of roster.data.roster) {
      if (r.grade && gradeCounts.has(r.grade)) gradeCounts.set(r.grade, (gradeCounts.get(r.grade) ?? 0) + 1);
    }
    return { classAverage, highestTotal, passPercentage, gradeCounts };
  }, [roster.data]);

  const maxGradeCount = stats ? Math.max(1, ...GRADE_BANDS.map((g) => stats.gradeCounts.get(g) ?? 0)) : 1;

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <CoePageHeader title="Marks entry" subtitle="Manual entry, bulk upload, validation and locking" />

      {filtersLoading ? (
        <SkeletonFilterBar />
      ) : (
        <Card>
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-ink">Batch</label>
              <Select value={effectiveBatchId ?? ""} onChange={(e) => { setBatchId(Number(e.target.value)); setDepartmentId(null); setSection(null); setSubjectId(null); }}>
                {batchOptions.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-ink">Department</label>
              <Select value={effectiveDepartmentId ?? ""} onChange={(e) => { setDepartmentId(Number(e.target.value)); setSection(null); setSubjectId(null); }}>
                {departmentOptions.map((d) => (
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
                onChange={(e) => { setSemester(Number(e.target.value)); setExamTypeId(null); setBatchId(null); setDepartmentId(null); setSection(null); setSubjectId(null); }}
              >
                {semestersForYear.map((s) => (
                  <option key={s} value={s}>
                    Semester {s}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-ink">Subject</label>
              <Select value={effectiveSubjectMappingId ?? ""} onChange={(e) => setSubjectId(mappingsForClassExam.find((m) => m.id === Number(e.target.value))?.subject_id ?? null)}>
                {mappingsForClassExam.length === 0 && <option value="">No papers mapped</option>}
                {mappingsForClassExam.map((m) => (
                  <option key={m.id} value={m.id}>
                    {subjectsById.get(m.subject_id)?.subject_code ?? `#${m.subject_id}`} · {subjectsById.get(m.subject_id)?.name ?? ""}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-ink">Examination type</label>
              <Select value={effectiveExamTypeId ?? ""} onChange={(e) => { setExamTypeId(Number(e.target.value)); setSubjectId(null); }}>
                {examTypeOptions.map((id) => (
                  <option key={id} value={id}>
                    {examTypesById.get(id)?.name ?? `Type #${id}`}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-ink">Section</label>
              <Select value={effectiveSection ?? ""} onChange={(e) => { setSection(e.target.value); setSubjectId(null); }}>
                {sectionOptions.map((s) => (
                  <option key={s} value={s}>
                    Section {s}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-ink">Academic year</label>
              <Select
                value={effectiveAcademicYear ?? ""}
                onChange={(e) => { setAcademicYear(e.target.value); setSemester(null); setExamTypeId(null); setBatchId(null); setDepartmentId(null); setSection(null); setSubjectId(null); }}
              >
                {academicYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </Card>
      )}

      {roster.isLoading ? (
        <SkeletonBlock />
      ) : !effectiveSubjectMappingId ? (
        <Card>
          <p className="text-[13px] text-subtle">No paper mapped for this batch/department/section/semester/subject combination yet.</p>
        </Card>
      ) : roster.isError ? (
        <Card className="border-danger-border bg-danger-bg">
          <p className="text-[13px] text-danger-fg">{(roster.error as Error).message}</p>
        </Card>
      ) : roster.data ? (
        <div className="grid grid-cols-[1.7fr_1fr] gap-4 items-start">
          <Card className="p-0">
            <div className="flex items-start justify-between gap-3 border-b border-divider px-5 py-4">
              <div>
                <div className="text-[15.5px] font-extrabold text-ink">
                  {roster.data.mapping.subject_code} · {roster.data.mapping.subject_name}
                </div>
                <div className="mt-0.5 text-[12px] text-muted">
                  {roster.data.mapping.department_code} · Semester {roster.data.mapping.semester} · Section {roster.data.mapping.section} ·{" "}
                  {roster.data.mapping.batch_name} · {roster.data.mapping.exam_type_name} · {roster.data.entries_recorded} of{" "}
                  {roster.data.total_students} entered
                </div>
              </div>
              <Button
                variant="primarySmall"
                disabled={roster.data.is_locked || setLock.isPending}
                onClick={() => setLock.mutate({ exam_id: roster.data!.mapping.exam_id, department_id: roster.data!.mapping.department_id, is_locked: true })}
              >
                {roster.data.is_locked ? "Locked" : setLock.isPending ? "Locking…" : "Lock marks entry"}
              </Button>
            </div>

            {!roster.data.pass_rules && (
              <p className="px-5 py-3 text-[12px] text-danger-fg">
                No pass-rules row exists yet (Settings → Marks and pass rules) — entry is disabled until internal/external max marks are set.
              </p>
            )}

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-divider text-left text-[11px] font-extrabold uppercase tracking-[.06em] text-subtle">
                    <th className="px-5 py-3">Register no.</th>
                    <th className="py-3">Candidate</th>
                    <th className="py-3">Internal</th>
                    <th className="py-3">External / {roster.data.pass_rules?.external_max_marks ?? "—"}</th>
                    <th className="py-3">Total</th>
                    <th className="py-3">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.data.roster.map((entry) => (
                    <tr key={entry.student_id} className="border-b border-divider last:border-0">
                      <td className="px-5 py-3 text-[13px] font-bold text-primary">{entry.register_no}</td>
                      <td className="py-3 text-[13.5px] text-ink">{entry.name ?? "—"}</td>
                      <td className="py-3 text-[13px] text-ink">
                        {entry.internal ? `${entry.internal.marks_obtained ?? "—"} / ${entry.internal.max_marks}` : "—"}
                      </td>
                      <td className="py-3">
                        {roster.data!.pass_rules ? (
                          <ExternalCell
                            entry={entry}
                            externalMax={roster.data!.pass_rules.external_max_marks}
                            locked={roster.data!.is_locked}
                            onSave={(v) => handleSaveExternal(entry, v)}
                          />
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-3 text-[13px] text-ink">{entry.total ?? "—"}</td>
                      <td className="py-3 text-[13px] font-bold text-ink">{entry.grade ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="flex flex-col gap-4">
            <Card>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[26px] font-extrabold text-ink">
                    {roster.data.entries_recorded}/{roster.data.total_students}
                  </div>
                  <div className="text-[12px] text-muted">Entries recorded</div>
                </div>
                <div>
                  <div className="text-[26px] font-extrabold text-ink">{stats?.classAverage != null ? stats.classAverage.toFixed(1) : "—"}</div>
                  <div className="text-[12px] text-muted">Class average</div>
                </div>
                <div>
                  <div className="text-[26px] font-extrabold text-ink">{stats?.passPercentage != null ? `${stats.passPercentage.toFixed(0)}%` : "—"}</div>
                  <div className="text-[12px] text-muted">Pass percentage</div>
                </div>
                <div>
                  <div className="text-[26px] font-extrabold text-ink">{stats?.highestTotal ?? "—"}</div>
                  <div className="text-[12px] text-muted">Highest total</div>
                </div>
              </div>
            </Card>

            <Card>
              <h2 className="text-[15px] font-extrabold text-ink">Grade distribution</h2>
              <div className="mt-4 flex items-end justify-between gap-2" style={{ height: 90 }}>
                {GRADE_BANDS.map((g) => {
                  const count = stats?.gradeCounts.get(g) ?? 0;
                  const heightPercent = Math.max(4, (count / maxGradeCount) * 100);
                  return (
                    <div key={g} className="flex flex-1 flex-col items-center gap-1.5">
                      <span className="text-[11px] font-bold text-muted">{count}</span>
                      <div className="flex w-full flex-1 items-end">
                        <div
                          className={g === "U" ? "w-full rounded-[3px] bg-danger-border" : "w-full rounded-[3px] bg-primary"}
                          style={{ height: `${heightPercent}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-bold text-subtle">{g}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  );
}
