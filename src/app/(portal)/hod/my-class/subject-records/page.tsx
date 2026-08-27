"use client";

import { useMemo, useState } from "react";
import { Card, Badge, Button, Input, Select, SkeletonFilterBar, SkeletonStatTiles, SkeletonTable } from "@/components/ui";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { useHodSubjectRecords, type HodSubjectRecordsStudentRow } from "@/modules/hod/api/myClassSubjectRecords";
import {
  useSubjectRecords,
  useSubjectRecordDetail,
  usePublishSubjectRecord,
} from "@/modules/advisor/api/subject-records";
import { useExamMarkRoster, useEnterExamMarks, useUpdateExamMark } from "@/modules/advisor/api/exam-marks";

const ROMAN_YEAR = ["I", "II", "III", "IV", "V", "VI"];
function yearLabelForSemester(semester: number | null): string {
  if (semester == null) return "";
  const yearIndex = Math.ceil(semester / 2) - 1;
  return ROMAN_YEAR[yearIndex] ?? String(yearIndex + 1);
}

function gradeTone(grade: string): "accent" | "accentDark" | "danger" {
  if (grade === "RA") return "danger";
  if (grade === "O" || grade === "A+") return "accentDark";
  return "accent";
}

function gradeOf(pct: number | null): string | null {
  if (pct === null) return null;
  if (pct >= 91) return "O";
  if (pct >= 81) return "A+";
  if (pct >= 71) return "A";
  if (pct >= 61) return "B+";
  if (pct >= 50) return "B";
  return "RA";
}

function errorMessageOf(e: unknown): string {
  if (e instanceof Error) return e.message;
  return "Failed to save marks.";
}

function GradebookTab() {
  const [classKey, setClassKey] = useState<string | null>(null);
  const [semester, setSemester] = useState<number | null>(null);

  const [classId, subjectId] = classKey ? classKey.split(":").map(Number) : [undefined, undefined];
  const overview = useHodSubjectRecords(classId, subjectId, semester ?? undefined);

  const o = overview.data;
  const handled = o?.handled_classes ?? [];
  const columns = o?.columns ?? [];
  const students = o?.students ?? [];

  const tableColumns: DataTableColumn<HodSubjectRecordsStudentRow & { rowNo: number }>[] = [
    {
      key: "no",
      header: "",
      width: "34px",
      render: (r) => <span className="text-[12.5px] font-bold text-[#080000]">{String(r.rowNo).padStart(2, "0")}</span>,
    },
    {
      key: "student",
      header: "Student",
      width: "2.4fr",
      render: (r) => (
        <div className="min-w-0">
          <div className="truncate text-[14.5px] font-bold text-[#080000]">{r.name}</div>
          <div className="truncate text-[12px] font-bold text-[#080000]">{[r.student_id_no, r.email].filter(Boolean).join(" · ")}</div>
        </div>
      ),
    },
    ...columns.map(
      (col): DataTableColumn<HodSubjectRecordsStudentRow & { rowNo: number }> => ({
        key: `col-${col.mapping_id}`,
        header: <span className="whitespace-nowrap">{col.label}</span>,
        width: "1fr",
        align: "right",
        render: (r) => {
          const cell = r.cells.find((c) => c.mapping_id === col.mapping_id);
          if (!cell) return <span className="text-subtle">—</span>;
          if (cell.is_absent) return <span className="font-bold text-danger-fg">AB</span>;
          if (cell.marks_obtained == null) return <span className="text-subtle">—</span>;
          return (
            <span className="text-[14px]">
              <span className="font-bold text-ink">{cell.marks_obtained}</span>
              {col.max_marks != null && <span className="text-subtle"> / {col.max_marks}</span>}
            </span>
          );
        },
      }),
    ),
    {
      key: "grade",
      header: "Semester Grade",
      width: "1fr",
      align: "right",
      render: (r) => (r.grade ? <Badge tone={gradeTone(r.grade)}>{r.grade}</Badge> : <span className="text-subtle">—</span>),
    },
  ];

  return (
    <>
      {overview.isError && (
        <div className="rounded-[11px] border border-danger-border bg-danger-bg px-4 py-2.5 text-[13px] font-semibold text-danger-fg">
          Couldn&apos;t load subject records — please try again.
        </div>
      )}

      {overview.isLoading ? (
        <div className="flex flex-col gap-5">
          <SkeletonFilterBar />
          <SkeletonStatTiles count={3} />
          <SkeletonTable rows={7} />
        </div>
      ) : overview.isError ? null : handled.length === 0 ? (
        <Card>
          <div className="text-[13px] text-subtle">You are not mapped to teach any class/subject yet.</div>
        </Card>
      ) : (
        <>
          <Card className="hod-hover-card">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="mb-1.5 block text-[11px] font-extrabold tracking-[.08em] text-subtle uppercase">
                  Semester
                </label>
                <Select
                  value={semester ?? o?.selected_semester ?? ""}
                  onChange={(e) => setSemester(Number(e.target.value))}
                  disabled={(o?.semesters ?? []).length === 0}
                  className="font-bold text-[#080000]"
                >
                  {(o?.semesters ?? []).length === 0 ? (
                    <option value="">No internal marks recorded yet</option>
                  ) : (
                    o!.semesters.map((s) => (
                      <option key={s} value={s}>
                        Semester {s}
                      </option>
                    ))
                  )}
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-extrabold tracking-[.08em] text-subtle uppercase">
                  Class &amp; Subject
                </label>
                <Select
                  value={classKey ?? `${handled[0].class_id}:${handled[0].subject_id}`}
                  onChange={(e) => {
                    setClassKey(e.target.value);
                    setSemester(null);
                  }}
                  className="font-bold text-[#080000]"
                >
                  {handled.map((h) => (
                    <option key={`${h.class_id}:${h.subject_id}`} value={`${h.class_id}:${h.subject_id}`}>
                      {yearLabelForSemester(h.semester)}-{h.section} · {h.subject_code} {h.subject_name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </Card>

          {columns.length === 0 ? (
            <Card>
              <div className="text-[13px] text-subtle">No internal marks recorded for this class &amp; subject yet.</div>
            </Card>
          ) : (
            <>
              <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns.length + 1}, 1fr)` }}>
                <Card className="hod-hover-card">
                  <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Students</div>
                  <div className="mt-1.5 text-[26px] font-extrabold text-ink">{o?.student_count ?? 0}</div>
                </Card>
                {columns.map((col) => (
                  <Card key={col.mapping_id} className="hod-hover-card">
                    <div className="truncate text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">
                      {col.label} Avg
                    </div>
                    <div className="mt-1.5 text-[26px] font-extrabold text-ink">{col.average ?? "—"}</div>
                  </Card>
                ))}
              </div>

              <div className="overflow-x-auto">
                <DataTable
                  columns={tableColumns}
                  data={students.map((s, i) => ({ ...s, rowNo: i + 1 }))}
                  rowKey={(r) => r.student_id}
                  rowClassName="hod-hover-row"
                  className="min-w-[900px]"
                />
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}

function EnterMarksTab() {
  const records = useSubjectRecords();
  const rows = useMemo(() => records.data ?? [], [records.data]);

  const semesters = useMemo(() => Array.from(new Set(rows.map((r) => r.exam.semester))).sort((a, b) => a - b), [rows]);
  const [semOverride, setSemOverride] = useState<number | null>(null);
  const sem = semOverride ?? (semesters.length ? semesters[semesters.length - 1] : null);

  const inSemester = rows.filter((r) => r.exam.semester === sem);
  const [mappingOverride, setMappingOverride] = useState<number | null>(null);
  const mappingId =
    mappingOverride != null && inSemester.some((r) => r.exam_subject_mapping_id === mappingOverride)
      ? mappingOverride
      : (inSemester[0]?.exam_subject_mapping_id ?? null);
  function setSem(next: number) {
    setSemOverride(next);
    setMappingOverride(null);
  }
  function setMappingId(next: number) {
    setMappingOverride(next);
  }

  const active = inSemester.find((r) => r.exam_subject_mapping_id === mappingId);
  // Only internal (CIA1/2/3) exams are entered here — University End
  // Semester marks come from COE's own pipeline and are read-only. The
  // backend enforces this too (see subject-records/exam-marks services).
  const isInternalExam = active?.exam.category === "internal";
  const detail = useSubjectRecordDetail(mappingId ?? undefined);
  const publish = usePublishSubjectRecord();

  const roster = useExamMarkRoster(mappingId ?? undefined);
  const enterMarks = useEnterExamMarks();
  const updateMark = useUpdateExamMark();
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [maxMarksInput, setMaxMarksInput] = useState("100");
  const [saveError, setSaveError] = useState<string | null>(null);

  const students = roster.data?.students ?? [];
  const maxM = roster.data?.max_marks ?? (Number(maxMarksInput) || null);
  const entered = students.map((s) => s.marks_obtained).filter((m): m is number => m !== null);
  const mean = entered.length ? Math.round((entered.reduce((a, b) => a + b, 0) / entered.length) * 10) / 10 : null;

  function saveMarks() {
    if (!mappingId || !isInternalExam) return;
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
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="mb-1.5 block text-[11px] font-extrabold tracking-[.08em] text-subtle uppercase">Semester</label>
            <Select
              value={sem ?? ""}
              onChange={(e) => {
                setSem(Number(e.target.value));
                setDrafts({});
              }}
              className="font-bold text-[#080000]"
            >
              {semesters.map((s) => (
                <option key={s} value={s}>
                  Semester {s}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-extrabold tracking-[.08em] text-subtle uppercase">Subject · Exam</label>
            <Select
              value={mappingId ?? ""}
              onChange={(e) => {
                setMappingId(Number(e.target.value));
                setDrafts({});
              }}
              className="font-bold text-[#080000]"
            >
              {inSemester.map((o) => (
                <option key={o.exam_subject_mapping_id} value={o.exam_subject_mapping_id}>
                  {o.class.label} · {o.subject.subject_code} {o.subject.name} · {o.exam.type}
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
        <Card className="hod-hover-card">
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

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Badge tone={active.is_published ? "accentDark" : "neutral"}>
              {active.is_published ? "Published" : "Draft · not published"}
            </Badge>
            {!isInternalExam && <Badge tone="neutral">University exam · published by COE, view only</Badge>}
            {!roster.data?.max_marks && !active.is_published && isInternalExam && (
              <div className="flex items-center gap-2">
                <div className="text-[12.5px] font-bold text-body">Max marks</div>
                <Input
                  value={maxMarksInput}
                  onChange={(e) => setMaxMarksInput(e.target.value)}
                  className="w-[76px] py-2 text-center font-bold"
                />
              </div>
            )}
            <div className="flex-1" />
            {!active.is_published && isInternalExam && (
              <>
                <Button
                  variant="secondary"
                  className="w-auto"
                  onClick={saveMarks}
                  loading={enterMarks.isPending || updateMark.isPending}
                >
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
              <div>Grade</div>
            </div>
            {roster.isLoading ? (
              <div className="p-4">
                <SkeletonTable rows={6} />
              </div>
            ) : (
              students.map((s, i) => {
                const draft = drafts[s.student_id];
                const value = draft !== undefined ? draft : s.marks_obtained !== null ? String(s.marks_obtained) : "";
                const pct = s.marks_obtained !== null && maxM ? (s.marks_obtained / maxM) * 100 : null;
                const grade = gradeOf(pct);
                return (
                  <div
                    key={s.student_id}
                    className="hod-hover-row grid grid-cols-[2.4fr_1.2fr_1fr] items-center gap-2 border-b border-divider px-4 py-3 last:border-b-0"
                  >
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
                        className="w-20 py-2 text-center font-bold"
                      />
                      <span className="text-[11.5px] font-semibold text-subtle"> / {maxM ?? "—"}</span>
                    </div>
                    <div>{grade && <Badge tone={gradeTone(grade)}>{grade}</Badge>}</div>
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

export default function HodSubjectRecordsPage() {
  const [tab, setTab] = useState<"gradebook" | "enter">("gradebook");

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-[#080000]">Subject Records</h1>
          <p className="mt-1 text-[13px] text-muted">
            {tab === "gradebook" ? "Marks for the subjects you handle personally" : "Enter marks · Save keeps a draft, Publish makes it visible"}
          </p>
        </div>
        <SegmentedTabs
          value={tab}
          onChange={(k) => setTab(k as "gradebook" | "enter")}
          options={[
            { key: "gradebook", label: "Gradebook" },
            { key: "enter", label: "Enter marks" },
          ]}
        />
      </div>

      {tab === "gradebook" ? <GradebookTab /> : <EnterMarksTab />}
    </div>
  );
}
