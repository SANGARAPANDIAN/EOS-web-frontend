"use client";

import { useMemo, useState } from "react";
import { Card, Badge, Button, Input, SkeletonRows } from "@/components/ui";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import {
  useHodAppraisalCriteria,
  useHodAppraisalHistory,
  useApplyHodAppraisal,
  type HodAppraisalDivision,
  type HodAppraisalHistoryRow,
} from "@/modules/hod/api/employeeAppraisal";
import { formatDisplayDate } from "@/lib/utils/date";

/** Display-only tier, derived from a real score/max — no schema column for "grade" exists. */
function appraisalGrade(percent: number): string {
  if (percent >= 90) return "A+";
  if (percent >= 80) return "A";
  if (percent >= 70) return "B+";
  if (percent >= 60) return "B";
  return "C";
}

function statusTone(status: string): "accent" | "danger" | "neutral" {
  if (status === "management_approved") return "accent";
  if (status === "rejected") return "danger";
  return "neutral";
}

function statusLabel(status: string): string {
  if (status === "management_approved") return "APPROVED";
  if (status === "rejected") return "REJECTED";
  return "UNDER REVIEW";
}

function statusFooter(row: HodAppraisalHistoryRow): string {
  switch (row.status) {
    case "management_approved":
      return row.management_approved_at ? `Approved by Principal on ${formatDisplayDate(row.management_approved_at)}` : "Approved";
    case "rejected":
      return "Rejected";
    case "hr_scored":
      return "Scored by HR, awaiting management approval";
    case "hod_reviewed":
      return "Reviewed by HoD, awaiting HR scoring";
    default:
      return "Submitted, awaiting HoD review";
  }
}

export default function HodEmployeeAppraisalPage() {
  const [tab, setTab] = useState<"apply" | "history">("apply");
  const criteria = useHodAppraisalCriteria();

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-[#080000]">Request Appraisal</h1>
          <p className="mt-1 text-[13px] text-muted">
            {criteria.data?.academic_year ? `Academic Year ${criteria.data.academic_year.replace("-", "–")}` : ""}
          </p>
        </div>
        <SegmentedTabs
          value={tab}
          onChange={(k) => setTab(k as "apply" | "history")}
          options={[
            { key: "apply", label: "Apply" },
            { key: "history", label: "History" },
          ]}
        />
      </div>

      {tab === "apply" ? <ApplyForm /> : <HistoryList />}
    </div>
  );
}

function ApplyForm() {
  const criteria = useHodAppraisalCriteria();
  const apply = useApplyHodAppraisal();

  const [expanded, setExpanded] = useState<number | null>(null);
  const [descriptions, setDescriptions] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const divisions = criteria.data?.divisions ?? [];

  function filledCount(division: HodAppraisalDivision): number {
    return division.criteria.filter((c) => (descriptions[c.id] ?? "").trim().length > 0).length;
  }

  async function submit() {
    if (!criteria.data?.academic_year) return;
    const entries = divisions.flatMap((d) =>
      d.criteria.map((c) => ({ criteria_id: c.id, description: descriptions[c.id] || undefined })),
    );
    await apply.mutateAsync({ academic_year: criteria.data.academic_year, entries });
    setSubmitted(true);
    setDescriptions({});
    setExpanded(null);
  }

  if (criteria.isLoading) {
    return <SkeletonRows count={3} />;
  }

  if (criteria.isError) {
    return (
      <div className="rounded-[11px] border border-danger-border bg-danger-bg px-4 py-2.5 text-[13px] font-semibold text-danger-fg">
        Couldn&apos;t load appraisal criteria — please try again.
      </div>
    );
  }

  if (divisions.length === 0) {
    return (
      <Card>
        <div className="text-[13px] text-subtle">No appraisal criteria published for this academic year yet.</div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {submitted && (
        <div className="rounded-[10px] bg-accent-50 px-4 py-3 text-[13px] font-bold text-primary">
          Appraisal request submitted.
        </div>
      )}

      {divisions.map((division) => {
        const isOpen = expanded === division.id;
        const maxTotal = division.criteria.reduce((sum, c) => sum + c.max_score, 0);
        return (
          <Card key={division.id} className={isOpen ? "hod-hover-card border-border-accent" : "hod-hover-card"}>
            <button
              type="button"
              onClick={() => setExpanded(isOpen ? null : division.id)}
              className="flex w-full items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <span className="h-6 w-[3px] rounded-full bg-primary" />
                <div className="text-left">
                  <div className="text-[16px] font-extrabold text-ink">{division.name}</div>
                  <div className="text-[12.5px] text-muted">
                    {division.criteria.length} criteria · max {maxTotal}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge tone="accent">
                  {filledCount(division)}/{division.criteria.length} filled
                </Badge>
                <span className="text-subtle">{isOpen ? "▲" : "▼"}</span>
              </div>
            </button>

            {isOpen && (
              <div className="mt-4 flex flex-col gap-4 border-t border-divider pt-4">
                {division.criteria.map((c) => (
                  <div key={c.id}>
                    <div className="flex items-center justify-between">
                      <span className="text-[13.5px] font-bold text-ink">{c.name}</span>
                      <span className="text-[12px] text-subtle">Max {c.max_score}</span>
                    </div>
                    <div className="mt-2 grid grid-cols-[110px_1fr] gap-3">
                      <Input
                        type="number"
                        max={c.max_score}
                        placeholder="Score"
                        disabled
                        title="Scored by HR during review, not at submission"
                        className="bg-surface-tint"
                      />
                      <Input
                        value={descriptions[c.id] ?? ""}
                        onChange={(e) => setDescriptions((d) => ({ ...d, [c.id]: e.target.value }))}
                        placeholder="Supporting remark or evidence"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        );
      })}

      <Button variant="primary" onClick={submit} loading={apply.isPending}>
        Submit Appraisal Request
      </Button>
    </div>
  );
}

function HistoryList() {
  const history = useHodAppraisalHistory();

  const rows = useMemo(() => {
    return (history.data ?? []).map((r) => {
      const scored = r.entries.every((e) => e.score != null);
      const totalScore = r.entries.reduce((sum, e) => sum + (e.score ?? 0), 0);
      const totalMax = r.entries.reduce((sum, e) => sum + e.criteria.max_score, 0);
      const percent = totalMax > 0 ? (totalScore / totalMax) * 100 : 0;
      return { row: r, scored, totalScore, totalMax, grade: appraisalGrade(percent) };
    });
  }, [history.data]);

  if (history.isLoading) {
    return <SkeletonRows count={3} />;
  }
  if (history.isError) {
    return (
      <div className="rounded-[11px] border border-danger-border bg-danger-bg px-4 py-2.5 text-[13px] font-semibold text-danger-fg">
        Couldn&apos;t load appraisal history — please try again.
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <Card>
        <div className="text-[13px] text-subtle">No past appraisal requests yet.</div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {rows.map(({ row, scored, totalScore, totalMax, grade }) => (
        <Card key={row.id} className="hod-hover-card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[10.5px] font-extrabold tracking-[.06em] text-subtle uppercase">
                APR-{row.academic_year.split("-")[1]}-{String(row.id).padStart(3, "0")}
              </div>
              <div className="mt-1 text-[16px] font-extrabold text-ink">
                Academic Year {row.academic_year.replace("-", "–")}
              </div>
              <div className="mt-0.5 text-[13px] text-body">
                {scored ? `Score ${totalScore} / ${totalMax} · Grade ${grade}` : "Awaiting score"}
              </div>
            </div>
            <Badge tone={statusTone(row.status)}>{statusLabel(row.status)}</Badge>
          </div>
          <div className="mt-3 border-t border-divider pt-3 text-[11.5px] text-subtle">{statusFooter(row)}</div>
        </Card>
      ))}
    </div>
  );
}
