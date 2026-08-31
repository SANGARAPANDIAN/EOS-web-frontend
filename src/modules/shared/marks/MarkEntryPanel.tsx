"use client";

import { useMemo, useState } from "react";
import { Card, Badge, Button, Input, Select, SkeletonFilterBar, SkeletonStatTiles, SkeletonTable } from "@/components/ui";
import { useSubjectRecords, useSubjectRecordDetail, usePublishSubjectRecord } from "@/modules/advisor/api/subject-records";
import { useExamMarkRoster, useEnterExamMarks, useUpdateExamMark } from "@/modules/advisor/api/exam-marks";
import { toPercentage, gradeOf, gradeTone } from "@/lib/utils/marks";

function errorMessageOf(e: unknown): string {
  if (e instanceof Error) return e.message;
  return "Failed to save marks.";
}

function subjectKeyOf(r: { class: { label: string }; subject: { subject_code: string } }): string {
  return `${r.class.label}|${r.subject.subject_code}`;
}

/**
 * Shared faculty mark-entry panel — every faculty who teaches a subject
 * enters marks for it here, for every class they teach it in, scoped
 * server-side to their own faculty_subject_class_mapping (GET
 * /me/subject-records). Used identically by HoD (their own class/subject)
 * and Faculty/Advisor (every subject they teach) — previously two
 * byte-for-byte-duplicated implementations differing only in inline vs
 * Tailwind styling.
 *
 * Subject and Exam type are two separate selects (previously combined into
 * one long, easily-truncated "Subject · Exam" string) so CIA1/CIA2/Quiz/
 * Internal/End-Sem is always visible and explicitly selectable. The 3rd
 * results column shows "Converted to 100" (computed live from whatever max
 * marks the faculty entered) for internal exams, and "Grade" (read-only,
 * COE-published) for the University end-semester exam — never both.
 */
export function MarkEntryPanel() {
  const records = useSubjectRecords();
  const rows = useMemo(() => records.data ?? [], [records.data]);

  const semesters = useMemo(() => Array.from(new Set(rows.map((r) => r.exam.semester))).sort((a, b) => a - b), [rows]);
  const [semOverride, setSemOverride] = useState<number | null>(null);
  const sem = semOverride ?? (semesters.length ? semesters[semesters.length - 1] : null);

  const inSemester = useMemo(() => rows.filter((r) => r.exam.semester === sem), [rows, sem]);

  const subjectOptions = useMemo(() => {
    const map = new Map<string, { key: string; label: string }>();
    for (const r of inSemester) {
      const key = subjectKeyOf(r);
      if (!map.has(key)) map.set(key, { key, label: `${r.class.label} · ${r.subject.subject_code} ${r.subject.name}` });
    }
    return Array.from(map.values());
  }, [inSemester]);

  const [subjectKeyOverride, setSubjectKeyOverride] = useState<string | null>(null);
  const subjectKey =
    subjectKeyOverride != null && subjectOptions.some((o) => o.key === subjectKeyOverride) ? subjectKeyOverride : (subjectOptions[0]?.key ?? null);

  const examTypeRows = useMemo(() => inSemester.filter((r) => subjectKeyOf(r) === subjectKey), [inSemester, subjectKey]);

  const [mappingOverride, setMappingOverride] = useState<number | null>(null);
  const mappingId =
    mappingOverride != null && examTypeRows.some((r) => r.exam_subject_mapping_id === mappingOverride)
      ? mappingOverride
      : (examTypeRows[0]?.exam_subject_mapping_id ?? null);

  const [drafts, setDrafts] = useState<Record<number, string>>({});

  function setSem(next: number) {
    setSemOverride(next);
    setSubjectKeyOverride(null);
    setMappingOverride(null);
    setDrafts({});
  }
  function setSubjectKey(next: string) {
    setSubjectKeyOverride(next);
    setMappingOverride(null);
    setDrafts({});
  }
  function setMappingId(next: number) {
    setMappingOverride(next);
    setDrafts({});
  }

  const active = inSemester.find((r) => r.exam_subject_mapping_id === mappingId);
  // Only internal (CIA1/CIA2/CIA3/Quiz) exams are entered here — University
  // End Semester marks come from COE's own pipeline and are read-only. The
  // backend enforces this too (see subject-records/exam-marks services).
  const isInternalExam = active?.exam.category === "internal";
  const detail = useSubjectRecordDetail(mappingId ?? undefined);
  const publish = usePublishSubjectRecord();

  const roster = useExamMarkRoster(mappingId ?? undefined);
  const enterMarks = useEnterExamMarks();
  const updateMark = useUpdateExamMark();
  const [maxMarksInput, setMaxMarksInput] = useState("100");
  const [saveError, setSaveError] = useState<string | null>(null);

  const students = roster.data?.students ?? [];
  const maxM = roster.data?.max_marks ?? (Number(maxMarksInput) || null);
  const entered = students.map((s) => s.marks_obtained).filter((m): m is number => m !== null);
  const mean = entered.length ? Math.round((entered.reduce((a, b) => a + b, 0) / entered.length) * 10) / 10 : null;

  function outOfRange(draftValue: string | undefined): boolean {
    if (draftValue === undefined || draftValue === "" || maxM === null) return false;
    const n = Number(draftValue);
    return Number.isFinite(n) && (n < 0 || n > maxM);
  }
  const hasOutOfRangeDraft = students.some((s) => outOfRange(drafts[s.student_id]));

  function saveMarks() {
    if (!mappingId || !isInternalExam || hasOutOfRangeDraft) return;
    setSaveError(null);
    const effectiveMaxMarks = roster.data?.max_marks || Number(maxMarksInput) || 100;
    const newEntries = students
      .filter((s) => s.mark_id === null && drafts[s.student_id] !== undefined && drafts[s.student_id] !== "")
      .map((s) => ({ student_id: s.student_id, marks_obtained: Number(drafts[s.student_id]) }))
      .filter((e) => Number.isFinite(e.marks_obtained));
    if (newEntries.length) {
      enterMarks.mutate(
        { mappingId, max_marks: effectiveMaxMarks, entries: newEntries },
        { onError: (e) => setSaveError(errorMessageOf(e)) },
      );
    }
    students
      .filter((s) => s.mark_id !== null && drafts[s.student_id] !== undefined && Number(drafts[s.student_id]) !== s.marks_obtained)
      .forEach((s) =>
        updateMark.mutate(
          { id: s.mark_id as number, marks_obtained: Number(drafts[s.student_id]) },
          { onError: (e) => setSaveError(errorMessageOf(e)) },
        ),
      );
    setDrafts({});
  }

  const passCount = detail.data ? detail.data.grade_distribution.filter((g) => g.grade !== "RA").reduce((s, g) => s + g.count, 0) : 0;
  const arrearCount = detail.data?.grade_distribution.find((g) => g.grade === "RA")?.count ?? 0;
  const passPct = detail.data && detail.data.total_students > 0 ? Math.round((passCount / detail.data.total_students) * 1000) / 10 : null;

  if (records.isError) {
    return (
      <div className="rounded-[11px] border border-danger-border bg-danger-bg px-4 py-2.5 text-[13px] font-semibold text-danger-fg">
        Couldn&apos;t load your exam mappings — please try again.
      </div>
    );
  }

  if (records.isLoading) {
    return (
      <div className="flex flex-col gap-5">
        <SkeletonFilterBar />
        <SkeletonStatTiles count={4} />
        <SkeletonTable rows={7} />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <Card>
        <div className="text-[13px] text-subtle">No exams have been mapped to a subject you teach yet.</div>
      </Card>
    );
  }

  return (
    <>
      <Card className="hod-hover-card">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-[11px] font-extrabold tracking-[.08em] text-subtle uppercase">Semester</label>
            <Select value={sem ?? ""} onChange={(e) => setSem(Number(e.target.value))} className="font-bold text-[#080000]">
              {semesters.map((s) => (
                <option key={s} value={s}>
                  Semester {s}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-extrabold tracking-[.08em] text-subtle uppercase">Subject</label>
            <Select value={subjectKey ?? ""} onChange={(e) => setSubjectKey(e.target.value)} className="font-bold text-[#080000]">
              {subjectOptions.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-extrabold tracking-[.08em] text-subtle uppercase">Exam type</label>
            <Select value={mappingId ?? ""} onChange={(e) => setMappingId(Number(e.target.value))} className="font-bold text-[#080000]">
              {examTypeRows.map((r) => (
                <option key={r.exam_subject_mapping_id} value={r.exam_subject_mapping_id}>
                  {r.exam.type}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="mt-3.5 border-t border-divider pt-3.5 text-[12.5px] font-bold text-body">
          {inSemester.length} exam record{inSemester.length === 1 ? "" : "s"} this semester
        </div>
      </Card>

      {active && (
        <Card className="hod-hover-card mt-5">
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-[220px] flex-1">
              <div className="text-[11px] font-extrabold tracking-[.08em] text-subtle uppercase">Current exam</div>
              <div className="mt-2 text-[20px] font-extrabold tracking-[-.02em] text-ink">
                {active.class.label} · {active.subject.subject_code} {active.subject.name}
              </div>
              <div className="mt-1 text-[12.5px] font-semibold text-muted">
                {active.exam.type} · {active.exam.academic_year}
              </div>
            </div>
            <div className="grid min-w-[320px] flex-[1.4] grid-cols-4 gap-3">
              {[
                { label: "Strength", value: String(students.length) },
                { label: "Mean", value: mean !== null ? String(mean) : "—" },
                { label: "Pass %", value: passPct !== null ? `${passPct}%` : "—" },
                { label: "Arrears", value: String(arrearCount) },
              ].map((s) => (
                <div key={s.label} className="rounded-[11px] border border-divider bg-surface-tint px-3.5 py-3">
                  <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">{s.label}</div>
                  <div className="mt-1 text-[18px] font-extrabold tracking-[-.02em] text-ink">{s.value}</div>
                </div>
              ))}
            </div>
          </div>

          {saveError && (
            <div className="mt-3.5 rounded-[9px] border border-danger-border bg-danger-bg px-4 py-2.5 text-[12.5px] font-semibold text-danger-fg">
              {saveError}
            </div>
          )}
          {hasOutOfRangeDraft && (
            <div className="mt-3.5 rounded-[9px] border border-danger-border bg-danger-bg px-4 py-2.5 text-[12.5px] font-semibold text-danger-fg">
              One or more marks are negative or exceed the max marks ({maxM}) — fix the highlighted row(s) before saving.
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Badge tone={active.is_published ? "accentDark" : "neutral"}>{active.is_published ? "Published" : "Draft · not published"}</Badge>
            {!isInternalExam && <Badge tone="neutral">University exam · published by COE, view only</Badge>}
            {!roster.data?.max_marks && !active.is_published && isInternalExam && (
              <div className="flex items-center gap-2">
                <div className="text-[12.5px] font-bold text-body">Max marks</div>
                <Input value={maxMarksInput} onChange={(e) => setMaxMarksInput(e.target.value)} className="w-[76px] py-2 text-center font-bold" />
              </div>
            )}
            <div className="flex-1" />
            {!active.is_published && isInternalExam && (
              <>
                <Button variant="secondary" className="w-auto" onClick={saveMarks} disabled={hasOutOfRangeDraft} loading={enterMarks.isPending || updateMark.isPending}>
                  Save
                </Button>
                <Button
                  variant="primarySmall"
                  onClick={() => active.entered_count > 0 && publish.mutate(active.exam_subject_mapping_id)}
                  disabled={active.entered_count === 0}
                  loading={publish.isPending}
                >
                  Publish
                </Button>
              </>
            )}
          </div>

          <div className="mt-5 overflow-hidden rounded-[12px] border border-divider">
            <div className="grid grid-cols-[2.4fr_1.2fr_1fr] gap-2 border-b border-divider bg-surface-tint px-4 py-3 text-[10.5px] font-extrabold tracking-[.09em] text-subtle uppercase">
              <div>Student</div>
              <div>Marks obtained</div>
              <div>{isInternalExam ? "Converted to 100" : "Grade"}</div>
            </div>
            {roster.isLoading ? (
              <div className="p-4">
                <SkeletonTable rows={6} />
              </div>
            ) : (
              students.map((s, i) => {
                const draft = drafts[s.student_id];
                const value = draft !== undefined ? draft : s.marks_obtained !== null ? String(s.marks_obtained) : "";
                const draftNumber = draft !== undefined && draft !== "" ? Number(draft) : null;
                const effectiveMarks = draftNumber !== null && Number.isFinite(draftNumber) ? draftNumber : s.marks_obtained;
                const pct = toPercentage(effectiveMarks, maxM);
                const grade = gradeOf(pct);
                const invalid = outOfRange(draft);
                return (
                  <div key={s.student_id} className="hod-hover-row grid grid-cols-[2.4fr_1.2fr_1fr] items-center gap-2 border-b border-divider px-4 py-3 last:border-b-0">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="w-6 text-[12px] font-extrabold text-subtle">{i + 1}</div>
                      <div className="min-w-0">
                        <div className="truncate text-[13.5px] font-bold text-ink">{s.name}</div>
                        <div className="mt-0.5 truncate text-[11px] font-semibold text-subtle">{s.roll_no}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Input
                        value={value}
                        onChange={(e) => setDrafts((prev) => ({ ...prev, [s.student_id]: e.target.value }))}
                        disabled={!isInternalExam || active.is_published || (roster.data?.locked && s.mark_id === null)}
                        className={`w-20 py-2 text-center font-bold ${invalid ? "border-danger-border text-danger-fg" : ""}`}
                      />
                      <span className="text-[11.5px] font-semibold text-subtle"> / {maxM ?? "—"}</span>
                    </div>
                    <div>
                      {isInternalExam ? (
                        <span className="text-[14px] font-bold text-ink">{pct != null ? `${pct}%` : "—"}</span>
                      ) : (
                        grade && <Badge tone={gradeTone(grade)}>{grade}</Badge>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            {!roster.isLoading && students.length === 0 && (
              <div className="p-10 text-center text-[13.5px] font-semibold text-subtle">No students found for this exam.</div>
            )}
          </div>
        </Card>
      )}
    </>
  );
}
