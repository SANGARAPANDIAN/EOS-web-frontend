"use client";

import { useMemo, useState } from "react";
import { Card, Badge, SegmentedTabs, Select, EmptyState, Icon, DataTable } from "@/components/ui";
import type { DataTableColumn } from "@/components/ui/DataTable";
import { useMyAcademicCalendar } from "@/modules/student/api/profile";
import { useMyExamResults, type ExamResultGroup, type ExamResultSubject } from "@/modules/student/api/examResults";
import { useSubjectsLookup } from "@/modules/shared/api/subjects";
import { percentageToGrade, isPassingPercentage, computeGpa } from "@/lib/config";

type Tab = "internals" | "semester";

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function PassFailBadge({ pct }: { pct: number }) {
  const pass = isPassingPercentage(pct);
  return <Badge tone={pass ? "accent" : "accentDark"}>{pass ? "Pass" : "Fail"}</Badge>;
}

function InternalsSubjectTable({ subjects }: { subjects: ExamResultSubject[] }) {
  const columns: DataTableColumn<ExamResultSubject>[] = [
    {
      key: "code",
      header: "Course",
      width: "2fr",
      render: (r) => (
        <div>
          <div className="font-semibold text-ink">{r.name}</div>
          <div className="font-mono text-[11px] text-muted">{r.code}</div>
        </div>
      ),
    },
    { key: "max", header: "Max", width: "1fr", align: "right", render: (r) => r.max },
    { key: "scored", header: "Scored", width: "1fr", align: "right", render: (r) => r.scored },
    { key: "result", header: "Pass/Fail", width: "1fr", align: "right", render: (r) => <PassFailBadge pct={(r.scored / r.max) * 100} /> },
  ];
  return <DataTable columns={columns} data={subjects} rowKey={(r) => r.subject_id} />;
}

function SemesterSubjectTable({ subjects }: { subjects: ExamResultSubject[] }) {
  const columns: DataTableColumn<ExamResultSubject>[] = [
    { key: "name", header: "Course", width: "2fr", render: (r) => r.name },
    { key: "code", header: "Course code", width: "1.2fr", render: (r) => <span className="font-mono text-[12px] text-muted">{r.code}</span> },
    {
      key: "grade",
      header: "Grade",
      width: "1fr",
      align: "right",
      render: (r) => {
        const { grade, point } = percentageToGrade((r.scored / r.max) * 100);
        return (
          <Badge tone={grade === "RA" ? "accentDark" : "accent"}>
            {grade} · {point}
          </Badge>
        );
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
    return <EmptyState message="No internal assessments entered for this semester yet." />;
  }

  return (
    <div className="flex flex-col gap-3">
      {groups.map((group) => {
        const isOpen = expanded.has(group.exam_id);
        const pct = group.marks_total > 0 ? round1((group.marks_obtained / group.marks_total) * 100) : 0;
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
                <div className="text-[12px] text-muted">
                  {group.marks_obtained}/{group.marks_total} marks
                </div>
              </div>
              <Badge tone="accent">{pct}%</Badge>
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
  const [tab, setTab] = useState<Tab>("internals");

  const creditsById = useMemo(() => {
    const map = new Map<number, number | null>();
    for (const s of subjectsLookup.data ?? []) map.set(s.id, s.credits);
    return map;
  }, [subjectsLookup.data]);

  const semesterExam = examResults.data?.semester_exam;
  const semesterPct = useMemo(() => {
    if (!semesterExam || semesterExam.marks_total === 0) return null;
    return round1((semesterExam.marks_obtained / semesterExam.marks_total) * 100);
  }, [semesterExam]);

  const semesterGpa = useMemo(() => {
    if (!semesterExam) return null;
    return computeGpa(
      semesterExam.subjects.map((s) => ({
        percentage: (s.scored / s.max) * 100,
        credits: creditsById.get(s.subject_id),
      })),
    );
  }, [semesterExam, creditsById]);

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
                <div className="text-right">
                  {semesterPct !== null && (
                    <div className="text-[26px] font-extrabold tracking-[-.03em] text-primary-dark">{semesterPct}%</div>
                  )}
                  {semesterGpa !== null && <div className="text-[12.5px] text-primary-dark">GPA {semesterGpa}</div>}
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
