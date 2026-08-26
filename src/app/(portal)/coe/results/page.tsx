"use client";

import { useMemo, useState } from "react";
import { Card, Select, Button } from "@/components/ui";
import { CoePageHeader } from "@/modules/coe/PageHeader";
import { SkeletonFilterBar, SkeletonBlock } from "@/components/ui/Skeleton";
import { useExams } from "@/modules/coe/api/exams";
import { useExamTypes } from "@/modules/coe/api/reference";
import { useResultPublications, usePublishResults, useResultsSummary } from "@/modules/coe/api/results";
import { cn } from "@/lib/utils/cn";

export default function CoeResultsPage() {
  const exams = useExams();
  const examTypes = useExamTypes();
  const results = useResultPublications();
  const publish = usePublishResults();

  const [academicYear, setAcademicYear] = useState<string | null>(null);
  const [semester, setSemester] = useState<number | null>(null);
  const [examTypeId, setExamTypeId] = useState<number | null>(null);

  const examTypesById = useMemo(() => new Map((examTypes.data ?? []).map((t) => [t.id, t])), [examTypes.data]);
  const publishedExamIds = useMemo(() => new Set((results.data ?? []).map((r) => r.exam_id)), [results.data]);

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
  const alreadyPublished = effectiveExamId != null && publishedExamIds.has(effectiveExamId);

  const summary = useResultsSummary(effectiveExamId);
  const hasData = (summary.data?.candidates_evaluated ?? 0) > 0;

  const maxDeptPass = summary.data ? Math.max(1, ...summary.data.department_breakdown.map((d) => d.pass_percentage)) : 1;

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <CoePageHeader title="Result processing" subtitle="Grades, GPA, CGPA, moderation and publication" />

      {exams.isLoading ? (
        <SkeletonFilterBar />
      ) : (
        <Card>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-ink">Academic year</label>
              <Select
                value={effectiveAcademicYear ?? ""}
                onChange={(e) => {
                  setAcademicYear(e.target.value);
                  setSemester(null);
                  setExamTypeId(null);
                }}
              >
                {academicYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
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
                }}
              >
                {semestersForYear.map((s) => (
                  <option key={s} value={s}>
                    Semester {s}
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

      {summary.isLoading ? (
        <SkeletonBlock />
      ) : (
        <div className="flex items-center justify-between gap-4 rounded-[11px] border border-border-accent bg-accent-50 px-5 py-4">
          <div>
            <div className="text-[15px] font-extrabold text-primary">
              {alreadyPublished ? "Results published" : hasData ? "Results ready for publication" : "No marks recorded yet for this exam"}
            </div>
            <div className="mt-0.5 text-[13px] text-primary-dark">
              {alreadyPublished
                ? "Results are live for this exam."
                : hasData
                  ? `Processing complete for ${summary.data?.candidates_evaluated} candidate${summary.data?.candidates_evaluated === 1 ? "" : "s"} — awaiting COE approval.`
                  : "Enter marks on Marks entry before results can be published."}
            </div>
          </div>
          <Button variant="primarySmall" className="w-auto" disabled={!effectiveExamId || !hasData || alreadyPublished || publish.isPending} onClick={() => effectiveExamId && publish.mutate(effectiveExamId)}>
            {alreadyPublished ? "Already published" : publish.isPending ? "Publishing…" : "Publish results"}
          </Button>
        </div>
      )}
      {publish.isError && <p className="text-[12px] text-danger-fg">{(publish.error as Error).message}</p>}

      {summary.isLoading ? (
        <SkeletonBlock />
      ) : !hasData ? null : (
        <>
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <div className="text-[26px] font-extrabold text-ink">{summary.data!.overall_pass_percentage ?? "—"}%</div>
              <div className="mt-0.5 text-[12.5px] font-bold text-ink">Overall pass percentage</div>
              <div className="text-[11.5px] text-subtle">{summary.data!.candidates_evaluated} candidates evaluated</div>
            </Card>
            <Card>
              <div className="text-[26px] font-extrabold text-ink">{summary.data!.average_percentage != null ? (summary.data!.average_percentage / 10).toFixed(2) : "—"}</div>
              <div className="mt-0.5 text-[12.5px] font-bold text-ink">Average score (/10)</div>
              <div className="text-[11.5px] text-subtle">real average %, not a stored CGPA</div>
            </Card>
            <Card>
              <div className="text-[26px] font-extrabold text-ink">{summary.data!.arrears_count}</div>
              <div className="mt-0.5 text-[12.5px] font-bold text-ink">Arrears recorded</div>
              <div className="text-[11.5px] text-subtle">across {summary.data!.papers_with_arrears} papers</div>
            </Card>
            <Card>
              <div className="text-[26px] font-extrabold text-ink">{summary.data!.papers_moderated}</div>
              <div className="mt-0.5 text-[12.5px] font-bold text-ink">Papers moderated</div>
              <div className="text-[11.5px] text-subtle">grace marks applied to {summary.data!.candidates_with_grace_marks}</div>
            </Card>
          </div>

          <div className="grid grid-cols-[1.6fr_1fr] gap-4 items-start">
            <Card>
              <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-extrabold text-ink">Pass percentage by department · {effectiveAcademicYear}</h2>
              </div>
              <div className="mt-3.5 flex flex-col gap-3">
                {summary.data!.department_breakdown.length === 0 ? (
                  <p className="text-[13px] text-subtle">No department data for this exam yet.</p>
                ) : (
                  summary.data!.department_breakdown.map((d) => (
                    <div key={d.department_code}>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-[13.5px] font-bold text-ink">{d.department_code}</span>
                        <span className="text-[12.5px] text-muted">{d.pass_percentage}%</span>
                      </div>
                      <div className="h-[6px] overflow-hidden rounded-[4px] bg-surface-tint">
                        <div
                          className={cn(
                            "h-full rounded-[4px]",
                            d.pass_percentage >= 80 ? "bg-primary-dark" : d.pass_percentage >= 50 ? "bg-primary" : "bg-accent-300",
                          )}
                          style={{ width: `${Math.max(2, d.pass_percentage)}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>

            <Card>
              <h2 className="text-[15px] font-extrabold text-ink">Rank holders · {effectiveAcademicYear}</h2>
              <div className="mt-3 flex flex-col gap-3">
                {summary.data!.rank_holders.length === 0 ? (
                  <p className="text-[13px] text-subtle">Not enough real marks yet to compute rank holders.</p>
                ) : (
                  summary.data!.rank_holders.map((r, i) => (
                    <div key={r.student_id} className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-extrabold text-white">{i + 1}</span>
                        <div className="min-w-0">
                          <div className="truncate text-[13px] font-bold text-ink">{r.name ?? r.register_no}</div>
                          <div className="text-[11.5px] text-muted">
                            {r.register_no} · {r.department_code}
                          </div>
                        </div>
                      </div>
                      <span className="shrink-0 text-[13.5px] font-extrabold text-primary">{r.score.toFixed(2)}</span>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </>
      )}

      <Card className="p-0">
        <div className="border-b border-divider px-5 py-3.5">
          <span className="text-[15px] font-extrabold text-ink">Result publications</span>
        </div>
        {results.isLoading ? (
          <div className="p-4">
            <SkeletonBlock />
          </div>
        ) : (results.data?.length ?? 0) === 0 ? (
          <p className="px-5 py-6 text-[13px] text-subtle">No exam results have been published yet.</p>
        ) : (
          <div className="flex flex-col">
            {results.data!.map((r) => (
              <div key={r.id} className="flex items-center justify-between border-b border-divider px-5 py-3.5 last:border-0">
                <div>
                  <div className="text-[13.5px] font-bold text-ink">
                    {examTypesById.get(r.exams.exam_type_id)?.name ?? `Exam #${r.exam_id}`} · Sem {r.exams.semester} · {r.exams.academic_year}
                  </div>
                  <div className="mt-0.5 text-[12px] text-muted">
                    Published {new Date(r.published_at).toLocaleString()} by {r.users.email}
                  </div>
                </div>
                <span
                  className={cn(
                    "rounded-pill px-3 py-1 text-[11px] font-extrabold uppercase tracking-[.06em]",
                    r.publication_type === "original" ? "bg-accent-50 text-primary" : "bg-surface-tint text-ink-soft",
                  )}
                >
                  {r.publication_type}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
