"use client";

import { useMemo, useState } from "react";
import { Card, Badge, SegmentedTabs, Select, EmptyState, Icon, DataTable } from "@/components/ui";
import type { DataTableColumn } from "@/components/ui/DataTable";
import { useMyAcademicCalendar } from "@/modules/student/api/profile";
import { useMyExamResults, useMyCgpa, type ExamResultGroup, type ExamResultSubject } from "@/modules/student/api/examResults";
import { useSubjectsLookup } from "@/modules/shared/api/subjects";
import { useMyMarksheets } from "@/modules/student/api/marksheets";
import { percentageToGrade, isPassingPercentage, computeGpa } from "@/lib/config";

type Tab = "internals" | "semester";

function PassFailBadge({ pct }: { pct: number }) {
  const pass = isPassingPercentage(pct);
  return <Badge tone={pass ? "accent" : "accentDark"}>{pass ? "Pass" : "Fail"}</Badge>;
}

function facultyName(faculty: ExamResultSubject["faculty"]): string | null {
  if (!faculty) return null;
  return `${faculty.first_name} ${faculty.last_name}`.trim();
}

function CourseCell({ subject }: { subject: ExamResultSubject }) {
  const faculty = facultyName(subject.faculty);
  return (
    <div className="min-w-0">
      <div className="truncate font-semibold text-ink">{subject.name}</div>
      {faculty && <div className="truncate text-[11.5px] text-subtle">{faculty}</div>}
    </div>
  );
}

function InternalsSubjectTable({ subjects }: { subjects: ExamResultSubject[] }) {
  const columns: DataTableColumn<ExamResultSubject>[] = [
    { key: "code", header: "Code", width: "0.9fr", render: (r) => <span className="font-mono text-[12.5px] text-muted">{r.code}</span> },
    { key: "name", header: "Course", width: "1.6fr", render: (r) => <CourseCell subject={r} /> },
    { key: "max", header: "Max", width: "1fr", align: "right", render: (r) => r.max },
    { key: "scored", header: "Scored", width: "1fr", align: "right", render: (r) => r.scored },
    { key: "result", header: "Pass/Fail", width: "1fr", align: "right", render: (r) => <PassFailBadge pct={(r.scored / r.max) * 100} /> },
  ];
  return <DataTable columns={columns} data={subjects} rowKey={(r) => r.subject_id} />;
}

function SemesterSubjectTable({ subjects }: { subjects: ExamResultSubject[] }) {
  const columns: DataTableColumn<ExamResultSubject>[] = [
    { key: "code", header: "Code", width: "0.9fr", render: (r) => <span className="font-mono text-[12.5px] text-muted">{r.code}</span> },
    { key: "name", header: "Course", width: "1.6fr", render: (r) => <CourseCell subject={r} /> },
    {
      key: "grade",
      header: "Grade",
      width: "0.8fr",
      align: "right",
      render: (r) => {
        const { grade } = percentageToGrade((r.scored / r.max) * 100);
        return <Badge tone={grade === "RA" ? "accentDark" : "accent"}>{grade}</Badge>;
      },
    },
    {
      key: "point",
      header: "Credit point",
      width: "0.9fr",
      align: "right",
      render: (r) => {
        const { point } = percentageToGrade((r.scored / r.max) * 100);
        return <span className="font-mono text-[13.5px] font-bold text-ink">{point}</span>;
      },
    },
    { key: "result", header: "Pass/Fail", width: "1fr", align: "right", render: (r) => <PassFailBadge pct={(r.scored / r.max) * 100} /> },
  ];
  return <DataTable columns={columns} data={subjects} rowKey={(r) => r.subject_id} />;
}

function InternalsAccordion({ groups }: { groups: ExamResultGroup[] }) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  function toggle(examId: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(examId)) next.delete(examId);
      else next.add(examId);
      return next;
    });
  }

  if (groups.length === 0) {
    // Wrapped in a Card so the empty state looks the same whichever tab
    // you're on — the Semester exam tab's empty state is always inside a
    // Card, so without this the outer border would appear/disappear
    // depending on which tab happened to be selected.
    return (
      <Card>
        <EmptyState message="No internal assessments entered for this semester yet." />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {groups.map((group) => {
        const isOpen = expanded.has(group.exam_id);
        return (
          <div key={group.exam_id} className="overflow-hidden rounded-card border border-border-default">
            <button
              onClick={() => toggle(group.exam_id)}
              className="flex w-full items-center gap-3 bg-surface px-5 py-4 text-left"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-icon-chip text-[13px] font-extrabold text-primary">
                {group.number}
              </div>
              <div className="flex-1">
                <div className="text-[14.5px] font-bold text-ink">{group.title}</div>
              </div>
              <div className="text-right">
                <div className="text-[16px] font-extrabold leading-none text-ink">
                  {group.marks_obtained}
                  <span className="font-semibold text-muted">/{group.marks_total}</span>
                </div>
                <div className="mt-0.5 text-[10.5px] font-semibold uppercase tracking-[.04em] text-subtle">marks</div>
              </div>
              <Icon name={isOpen ? "expand_less" : "chevron_right"} size={20} className="text-subtle" />
            </button>
            {isOpen && (
              <div className="animate-fade-in border-t border-divider p-3">
                <InternalsSubjectTable subjects={group.subjects} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function PerformancePage() {
  const academicCalendar = useMyAcademicCalendar();
  const [semester, setSemester] = useState<number | null>(null);
  const effectiveSemester = semester ?? academicCalendar.data?.semester ?? null;
  const examResults = useMyExamResults(effectiveSemester);
  const subjectsLookup = useSubjectsLookup();
  const cgpa = useMyCgpa(effectiveSemester);
  const marksheets = useMyMarksheets();
  const [tab, setTab] = useState<Tab>("internals");

  const creditsById = useMemo(() => {
    const map = new Map<number, number | null>();
    for (const s of subjectsLookup.data ?? []) map.set(s.id, s.credits);
    return map;
  }, [subjectsLookup.data]);

  const semesterExam = examResults.data?.semester_exam;

  const semesterGpa = useMemo(() => {
    if (!semesterExam) return null;
    return computeGpa(
      semesterExam.subjects.map((s) => ({
        percentage: (s.scored / s.max) * 100,
        credits: creditsById.get(s.subject_id),
      })),
    );
  }, [semesterExam, creditsById]);

  const marksheetForSemester = useMemo(() => {
    if (!semesterExam) return null;
    return marksheets.data?.find((m) => m.exam_id === semesterExam.exam_id) ?? null;
  }, [marksheets.data, semesterExam]);

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex items-center justify-between">
        <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">Performance</h1>
        <Select
          value={effectiveSemester ?? ""}
          onChange={(e) => setSemester(Number(e.target.value))}
          className="w-auto"
        >
          {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              Semester {n}
            </option>
          ))}
        </Select>
      </div>

      <SegmentedTabs
        options={[
          { key: "internals", label: "Internals" },
          { key: "semester", label: "Semester exam" },
        ]}
        value={tab}
        onChange={(k) => setTab(k as Tab)}
        className="self-start"
      />

      {examResults.isLoading ? (
        <Card>
          <EmptyState message="Loading…" />
        </Card>
      ) : tab === "internals" ? (
        <InternalsAccordion groups={examResults.data?.internals ?? []} />
      ) : (
        <Card>
          {!semesterExam ? (
            <EmptyState message="Semester exam results have not been published yet." />
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between rounded-[11px] border border-border-accent bg-accent-50 px-4 py-3">
                <div>
                  <div className="text-[15px] font-extrabold text-primary-dark">{semesterExam.title}</div>
                  <div className="text-[12.5px] text-primary-dark">
                    {semesterExam.marks_obtained}/{semesterExam.marks_total} marks
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    {semesterGpa !== null && (
                      <div className="text-[22px] font-extrabold tracking-[-.03em] text-primary-dark">SGPA {semesterGpa}</div>
                    )}
                    <div className="text-[12.5px] font-semibold text-primary-dark">
                      CGPA {cgpa.isLoading ? "…" : (cgpa.cgpa ?? "—")}
                    </div>
                  </div>
                  {marksheetForSemester ? (
                    <a
                      href={marksheetForSemester.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 rounded-[9px] border border-border-accent bg-surface px-3.5 py-2.5 text-[12.5px] font-bold text-primary hover:bg-nav-hover"
                    >
                      <Icon name="download" size={16} />
                      Marksheet
                    </a>
                  ) : (
                    <div className="flex items-center gap-1.5 rounded-[9px] border border-dashed border-border-default px-3.5 py-2.5 text-[12px] font-semibold text-subtle">
                      <Icon name="description" size={16} />
                      Marksheet not yet issued
                    </div>
                  )}
                </div>
              </div>
              <SemesterSubjectTable subjects={semesterExam.subjects} />
            </>
          )}
        </Card>
      )}
    </div>
  );
}
