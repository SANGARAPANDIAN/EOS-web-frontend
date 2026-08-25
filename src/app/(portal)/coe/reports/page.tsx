"use client";

import { useMemo, useState } from "react";
import { Card, StatCard, Select, Button } from "@/components/ui";
import { CoePageHeader } from "@/modules/coe/PageHeader";
import { SkeletonBlock, SkeletonFilterBar } from "@/components/ui/Skeleton";
import { useExams } from "@/modules/coe/api/exams";
import { useExamTypes } from "@/modules/coe/api/reference";
import { useAllScriptBundles } from "@/modules/coe/api/scriptBundles";
import {
  useReportsAnalyticsSummary,
  type DepartmentComparison,
  type PassPercentageTrendPoint,
  type SubjectPerformanceRow,
  type ArrearBucket,
} from "@/modules/coe/api/reportsAnalytics";
import { exportToPdf, type PdfSection } from "@/lib/utils/pdf-export";
import { cn } from "@/lib/utils/cn";

const PREVIOUS_COLOR = "#dbe6ff";
const CURRENT_COLOR = "#1d4ed8";

function DeltaText({ value, suffix = " points vs previous cycle" }: { value: number | null; suffix?: string }) {
  if (value == null) return <span className="text-subtle">No previous cycle to compare</span>;
  const up = value > 0;
  const flat = value === 0;
  return (
    <span className={cn("font-semibold", flat ? "text-subtle" : up ? "text-[#15803d]" : "text-danger-fg")}>
      {flat ? "No change" : `${up ? "+" : ""}${value}${suffix}`}
    </span>
  );
}

function DeptBarChart({ data }: { data: DepartmentComparison[] }) {
  const [hover, setHover] = useState<number | null>(null);
  if (data.length === 0) return <p className="text-[13px] text-subtle">No department data for this cycle.</p>;

  const width = 720;
  const height = 220;
  const padBottom = 34;
  const padTop = 12;
  const groupWidth = width / data.length;
  const barWidth = Math.min(22, groupWidth / 3.2);
  const maxVal = 100;
  const scaleY = (pct: number) => padTop + (1 - pct / maxVal) * (height - padTop - padBottom);

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Department-wise pass percentage, current versus previous cycle">
        <line x1={0} y1={height - padBottom} x2={width} y2={height - padBottom} stroke="var(--color-border-default)" strokeWidth={1} />
        {data.map((d, i) => {
          const cx = i * groupWidth + groupWidth / 2;
          const prevX = cx - barWidth - 2;
          const curX = cx + 2;
          const prevY = d.previousPassPercentage != null ? scaleY(d.previousPassPercentage) : null;
          const curY = scaleY(d.currentPassPercentage);
          return (
            <g
              key={d.code}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover((h) => (h === i ? null : h))}
              className="cursor-pointer"
            >
              {prevY != null && (
                <rect x={prevX} y={prevY} width={barWidth} height={height - padBottom - prevY} rx={4} fill={PREVIOUS_COLOR} opacity={hover === null || hover === i ? 1 : 0.45} />
              )}
              <rect x={curX} y={curY} width={barWidth} height={height - padBottom - curY} rx={4} fill={CURRENT_COLOR} opacity={hover === null || hover === i ? 1 : 0.45} />
              <text x={cx} y={curY - 6} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--color-ink)">
                {d.currentPassPercentage}%
              </text>
              <text x={cx} y={height - padBottom + 16} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--color-muted)">
                {d.code}
              </text>
            </g>
          );
        })}
      </svg>
      {hover != null && (
        <div className="pointer-events-none absolute top-0 right-0 rounded-[8px] border border-border-default bg-surface px-3 py-2 text-[12px] shadow-modal">
          <div className="font-bold text-ink">{data[hover].code}</div>
          <div className="text-muted">Current: {data[hover].currentPassPercentage}% · {data[hover].candidates} candidates</div>
          {data[hover].previousPassPercentage != null && <div className="text-muted">Previous: {data[hover].previousPassPercentage}%</div>}
        </div>
      )}
      <div className="mt-2 flex items-center gap-4 text-[11.5px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px]" style={{ background: PREVIOUS_COLOR }} /> Previous cycle
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px]" style={{ background: CURRENT_COLOR }} /> Current cycle
        </span>
      </div>
    </div>
  );
}

function TrendLineChart({ data }: { data: PassPercentageTrendPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const points = data.filter((d) => d.passPercentage != null) as { examId: number; label: string; passPercentage: number }[];
  if (points.length === 0) return <p className="text-[13px] text-subtle">No prior cycles to trend yet.</p>;

  const width = 480;
  const height = 200;
  const padBottom = 26;
  const padTop = 16;
  const padX = 8;
  const minVal = Math.max(0, Math.min(...points.map((p) => p.passPercentage)) - 5);
  const maxVal = Math.min(100, Math.max(...points.map((p) => p.passPercentage)) + 5);
  const scaleX = (i: number) => padX + (points.length === 1 ? 0 : (i / (points.length - 1)) * (width - padX * 2));
  const scaleY = (v: number) => padTop + (1 - (v - minVal) / (maxVal - minVal || 1)) * (height - padTop - padBottom);

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${scaleX(i)} ${scaleY(p.passPercentage)}`).join(" ");
  const areaPath = `${linePath} L ${scaleX(points.length - 1)} ${height - padBottom} L ${scaleX(0)} ${height - padBottom} Z`;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Pass percentage trend across recent examination cycles">
        <line x1={0} y1={height - padBottom} x2={width} y2={height - padBottom} stroke="var(--color-border-default)" strokeWidth={1} />
        <path d={areaPath} fill="var(--color-accent-50)" />
        <path d={linePath} fill="none" stroke={CURRENT_COLOR} strokeWidth={2} />
        {points.map((p, i) => (
          <g key={p.examId} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover((h) => (h === i ? null : h))} className="cursor-pointer">
            <circle cx={scaleX(i)} cy={scaleY(p.passPercentage)} r={i === points.length - 1 ? 5 : 3.5} fill={CURRENT_COLOR} stroke="var(--color-surface)" strokeWidth={1.5} />
            <text x={scaleX(i)} y={height - padBottom + 16} textAnchor="middle" fontSize={10} fill="var(--color-muted)">
              {p.label}
            </text>
          </g>
        ))}
      </svg>
      {hover != null && (
        <div
          className="pointer-events-none absolute rounded-[8px] border border-border-default bg-surface px-3 py-2 text-[12px] shadow-modal"
          style={{ left: `${(scaleX(hover) / width) * 100}%`, top: 0, transform: "translateX(-50%)" }}
        >
          <div className="font-bold text-ink">{points[hover].label}</div>
          <div className="text-muted">{points[hover].passPercentage}% pass</div>
        </div>
      )}
    </div>
  );
}

function SubjectTrendBadge({ delta }: { delta: number | null }) {
  if (delta == null) return <span className="text-[12px] text-subtle">—</span>;
  const up = delta > 0;
  const flat = delta === 0;
  return (
    <span className={cn("text-[12px] font-bold", flat ? "text-subtle" : up ? "text-[#15803d]" : "text-danger-fg")}>
      {flat ? "0.0" : `${up ? "▲" : "▼"} ${Math.abs(delta).toFixed(1)}`}
    </span>
  );
}

function ArrearBucketBars({ buckets }: { buckets: ArrearBucket[] }) {
  const max = Math.max(1, ...buckets.map((b) => b.count));
  return (
    <div className="flex flex-col gap-2.5">
      {buckets.map((b) => (
        <div key={b.label}>
          <div className="flex items-center justify-between text-[12.5px]">
            <span className="font-semibold text-ink">{b.label}</span>
            <span className="font-bold text-ink">{b.count}</span>
          </div>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-pill bg-surface-tint">
            <div className="h-full rounded-pill bg-primary" style={{ width: `${(b.count / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CoeReportsAnalyticsPage() {
  const exams = useExams();
  const examTypes = useExamTypes();
  const allBundles = useAllScriptBundles();
  const [examId, setExamId] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);

  const examTypesById = useMemo(() => new Map((examTypes.data ?? []).map((t) => [t.id, t])), [examTypes.data]);

  const busiestExamId = useMemo(() => {
    const counts = new Map<number, number>();
    for (const b of allBundles.data ?? []) counts.set(b.exam_id, (counts.get(b.exam_id) ?? 0) + 1);
    let best: number | null = null;
    let bestCount = 0;
    for (const [id, count] of counts) {
      if (count > bestCount) {
        best = id;
        bestCount = count;
      }
    }
    return best;
  }, [allBundles.data]);
  const sortedExams = useMemo(() => [...(exams.data ?? [])].sort((a, b) => b.id - a.id), [exams.data]);
  const effectiveExamId = examId ?? busiestExamId ?? sortedExams[0]?.id ?? null;

  const summary = useReportsAnalyticsSummary(effectiveExamId);

  async function handleExportReport() {
    if (!summary.data) return;
    setExporting(true);
    try {
      const sections: PdfSection[] = [
        {
          type: "keyValue",
          title: "Cycle summary",
          rows: [
            ["Overall pass percentage", `${summary.data.overallPassPercentage ?? "—"}%`],
            ["Students with distinction", `${summary.data.studentsWithDistinction}`],
            ["Average CGPA", `${summary.data.averageCgpa ?? "—"}`],
            ["Arrear rate", `${summary.data.arrearRate ?? "—"}%`],
          ],
        },
        {
          type: "table",
          title: "Department-wise pass percentage",
          columns: [
            { header: "Department", key: "code" },
            { header: "Candidates", key: "candidates" },
            { header: "Current %", key: "current" },
            { header: "Previous %", key: "previous" },
          ],
          rows: summary.data.departmentComparison.map((d) => ({ code: d.code, candidates: d.candidates, current: `${d.currentPassPercentage}%`, previous: d.previousPassPercentage != null ? `${d.previousPassPercentage}%` : "—" })),
        },
        {
          type: "table",
          title: "Subject performance",
          columns: [
            { header: "Course", key: "code" },
            { header: "Appeared", key: "appeared" },
            { header: "Pass %", key: "pass" },
            { header: "Avg GPA", key: "gpa" },
          ],
          rows: summary.data.subjectPerformance.map((s) => ({ code: `${s.code} · ${s.name}`, appeared: s.appeared, pass: `${s.passPercentage}%`, gpa: s.avgGpa ?? "—" })),
        },
      ];
      await exportToPdf({ title: "Reports & Analytics", subtitle: summary.data.exam.label, sections, filename: "reports-analytics.pdf" });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <CoePageHeader
        title="Reports & Analytics"
        subtitle="Pass percentage, department and subject performance, arrear analysis and result comparison"
        actions={
          <div className="flex items-center gap-2">
            <Select value={effectiveExamId ?? ""} onChange={(e) => setExamId(Number(e.target.value))} className="w-64">
              {sortedExams.map((e) => (
                <option key={e.id} value={e.id}>
                  {examTypesById.get(e.exam_type_id)?.name ?? "Exam"} · Semester {e.semester} · {e.academic_year}
                </option>
              ))}
            </Select>
            <Button variant="primarySmall" className="w-auto px-3.5 py-2.5" disabled={!summary.data || exporting} onClick={handleExportReport}>
              {exporting ? "Exporting…" : "Export report"}
            </Button>
          </div>
        }
      />

      {exams.isLoading || examTypes.isLoading ? (
        <SkeletonFilterBar />
      ) : effectiveExamId == null ? (
        <Card>
          <p className="text-[13px] text-subtle">No examination available to report on yet.</p>
        </Card>
      ) : summary.isLoading ? (
        <SkeletonBlock />
      ) : summary.isError ? (
        <Card className="border-danger-border bg-danger-bg">
          <p className="text-[13px] text-danger-fg">{(summary.error as Error).message}</p>
        </Card>
      ) : summary.data ? (
        <>
          <div className="grid grid-cols-4 gap-4">
            <StatCard
              label="Overall pass percentage"
              value={summary.data.overallPassPercentage != null ? `${summary.data.overallPassPercentage}%` : "—"}
              sub={<DeltaText value={summary.data.overallPassPercentageDelta} />}
            />
            <StatCard
              label="Students with distinction"
              value={summary.data.studentsWithDistinction}
              sub={
                summary.data.studentsWithDistinctionPercentage != null ? (
                  <span className="text-subtle">{summary.data.studentsWithDistinctionPercentage}% of appeared</span>
                ) : undefined
              }
            />
            <StatCard label="Average CGPA" value={summary.data.averageCgpa ?? "—"} sub={<span className="text-subtle">across all programmes</span>} />
            <StatCard
              label="Arrear rate"
              value={summary.data.arrearRate != null ? `${summary.data.arrearRate}%` : "—"}
              sub={<DeltaText value={summary.data.arrearRateDelta} />}
            />
          </div>

          <div className="grid grid-cols-[1.4fr_1fr] gap-4 items-start">
            <Card>
              <div className="text-[15px] font-extrabold text-ink">Department-wise pass percentage</div>
              <div className="mt-0.5 text-[12.5px] text-muted">Current cycle against the previous cycle</div>
              <div className="mt-4">
                <DeptBarChart data={summary.data.departmentComparison} />
              </div>
            </Card>
            <Card>
              <div className="text-[15px] font-extrabold text-ink">Pass percentage trend</div>
              <div className="mt-0.5 text-[12.5px] text-muted">Last {summary.data.passPercentageTrend.length} examination cycles</div>
              <div className="mt-4">
                <TrendLineChart data={summary.data.passPercentageTrend} />
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-[1.4fr_1fr] gap-4 items-start">
            <Card className="p-0">
              <div className="border-b border-divider px-5 py-3.5 text-[15px] font-extrabold text-ink">Subject performance</div>
              {summary.data.subjectPerformance.length === 0 ? (
                <p className="px-5 py-6 text-[13px] text-subtle">No subjects marked for this cycle yet.</p>
              ) : (
                <div className="flex flex-col">
                  <div className="flex items-center gap-3 border-b border-divider bg-surface-subtle px-5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">
                    <div className="flex-1">Course</div>
                    <div className="w-[90px] text-right">Appeared</div>
                    <div className="w-[80px] text-right">Pass %</div>
                    <div className="w-[80px] text-right">Avg. GPA</div>
                    <div className="w-[70px] text-right">Trend</div>
                  </div>
                  {summary.data.subjectPerformance.map((s: SubjectPerformanceRow) => (
                    <div key={s.subjectId} className="flex items-center gap-3 border-b border-divider px-5 py-3 last:border-0">
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-extrabold text-primary">{s.code}</div>
                        <div className="truncate text-[12.5px] text-ink">{s.name}</div>
                      </div>
                      <div className="w-[90px] text-right text-[12.5px] text-ink">{s.appeared}</div>
                      <div className="w-[80px] text-right text-[13px] font-bold text-ink">{s.passPercentage}%</div>
                      <div className="w-[80px] text-right text-[12.5px] text-ink">{s.avgGpa ?? "—"}</div>
                      <div className="w-[70px] text-right">
                        <SubjectTrendBadge delta={s.trendDelta} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <div className="text-[15px] font-extrabold text-ink">Arrear analysis</div>
              <div className="mt-3">
                <ArrearBucketBars buckets={summary.data.arrearAnalysis.buckets} />
              </div>
              <div className="mt-3 flex items-center justify-between rounded-[10px] bg-surface-tint px-3.5 py-2.5 text-[12.5px]">
                <span className="font-semibold text-ink">Final year arrears</span>
                <span className="font-bold text-ink">{summary.data.arrearAnalysis.finalYearArrears}</span>
              </div>
              <div className="mt-4 flex flex-col gap-2 border-t border-divider pt-3 text-[12.5px]">
                <div className="flex items-center justify-between">
                  <span className="text-muted">Valuation completed</span>
                  <span className="font-bold text-ink">{summary.data.arrearAnalysis.valuationCompletedPercentage}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted">Fee collection</span>
                  <span className="font-bold text-ink">{summary.data.arrearAnalysis.feeCollectionPercentage}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted">Result comparison vs previous cycle</span>
                  <DeltaText value={summary.data.arrearAnalysis.resultComparisonDelta} suffix=" pts" />
                </div>
              </div>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
