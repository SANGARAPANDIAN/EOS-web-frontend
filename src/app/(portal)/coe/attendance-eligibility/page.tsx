"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, StatCard, PillTabs, SearchBar, Select, Button, Badge, type BadgeTone } from "@/components/ui";
import { CoePageHeader } from "@/modules/coe/PageHeader";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { useExams } from "@/modules/coe/api/exams";
import { useDepartments } from "@/modules/coe/api/reference";
import { useAllScriptBundles } from "@/modules/coe/api/scriptBundles";
import { useEligibility, useEligibilityStats, useCreateCondonation, useReviewCondonation, type Eligibility } from "@/modules/coe/api/attendanceEligibility";

const TABS: { key: "all" | Eligibility; label: string }[] = [
  { key: "all", label: "All students" },
  { key: "eligible", label: "Eligible" },
  { key: "pending", label: "Condonation pending" },
  { key: "detained", label: "Detained" },
];

const TONE: Record<Eligibility, BadgeTone> = { eligible: "accentDark", pending: "accent", detained: "danger" };

export default function CoeAttendanceEligibilityPage() {
  const exams = useExams();
  const departments = useDepartments();
  const [examId, setExamId] = useState<number | null>(null);
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | Eligibility>("all");
  const [search, setSearch] = useState("");

  // Attendance records live on real students, not on any exam directly —
  // defaulting to the highest-id exam often lands on a batch nobody has
  // attendance data for yet. Default instead to whichever exam's batch has
  // the most real script-bundle activity, since that's the batch actually
  // being worked with.
  const allScriptBundles = useAllScriptBundles();
  const busiestExamId = useMemo(() => {
    const counts = new Map<number, number>();
    for (const b of allScriptBundles.data ?? []) counts.set(b.exam_id, (counts.get(b.exam_id) ?? 0) + 1);
    let best: number | null = null;
    let bestCount = 0;
    for (const [id, count] of counts) {
      if (count > bestCount) {
        best = id;
        bestCount = count;
      }
    }
    return best;
  }, [allScriptBundles.data]);
  const effectiveExamId = examId ?? busiestExamId ?? [...(exams.data ?? [])].sort((a, b) => b.id - a.id)[0]?.id ?? null;
  const stats = useEligibilityStats(effectiveExamId);
  const rows = useEligibility(effectiveExamId, { department_id: departmentId, eligibility: filter === "all" ? null : filter, search });
  const createCondonation = useCreateCondonation();
  const reviewCondonation = useReviewCondonation();

  const data = rows.data ?? [];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <CoePageHeader
        title="Attendance & Eligibility"
        subtitle="Attendance percentage, eligibility status, detained students and condonation requests."
        actions={
          <Select value={effectiveExamId ?? ""} onChange={(e) => setExamId(Number(e.target.value))} className="w-64">
            {[...(exams.data ?? [])].sort((a, b) => b.id - a.id).map((e) => (
              <option key={e.id} value={e.id}>
                {e.exam_category} · {e.academic_year} · Sem {e.semester}
              </option>
            ))}
          </Select>
        }
      />

      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Eligible students" value={stats.data?.eligible_count ?? (stats.isLoading ? "…" : 0)} icon="verified" />
        <StatCard label={`Below ${stats.data?.threshold_pct ?? 75}%`} value={stats.data?.below_threshold_count ?? (stats.isLoading ? "…" : 0)} icon="trending_down" />
        <StatCard label="Detained" value={stats.data?.detained_count ?? (stats.isLoading ? "…" : 0)} icon="block" />
        <StatCard label="Condonation pending" value={stats.data?.condonation_pending_count ?? (stats.isLoading ? "…" : 0)} icon="hourglass_empty" />
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <PillTabs options={TABS} value={filter} onChange={(k) => setFilter(k as typeof filter)} />
          <div className="flex items-center gap-3">
            <Select value={departmentId ?? ""} onChange={(e) => setDepartmentId(e.target.value ? Number(e.target.value) : null)} className="w-40">
              <option value="">All departments</option>
              {(departments.data ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code}
                </option>
              ))}
            </Select>
            <SearchBar placeholder="Search by roll number or name…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-[260px]" />
          </div>
        </div>
      </Card>

      {rows.isLoading ? (
        <SkeletonTable rows={6} />
      ) : (
        <Card className="p-0">
          <div className="flex items-center justify-between border-b border-divider px-5 py-3.5">
            <span className="text-[15px] font-extrabold text-ink">Students</span>
            <span className="text-[12.5px] text-muted">{data.length} records</span>
          </div>
          {data.length === 0 ? (
            <p className="px-5 py-6 text-[13px] text-subtle">No students match the current filters.</p>
          ) : (
            <div className="flex flex-col">
              <div className="flex items-center gap-4 border-b border-divider bg-surface-subtle px-5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">
                <div className="flex-1">Student</div>
                <div className="w-[130px]">Department</div>
                <div className="w-[90px]">Attendance</div>
                <div className="w-[110px]">Shortfall</div>
                <div className="w-[110px]">Condonation</div>
                <div className="w-[100px]">Eligibility</div>
                <div className="w-[200px] text-right">Actions</div>
              </div>
              {data.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-4 border-b border-divider px-5 py-4 last:border-0">
                  <div className="flex-1">
                    <div className="text-[13.5px] font-bold text-ink">{r.name ?? r.register_no ?? r.student_id_no}</div>
                    <div className="text-[11.5px] text-muted">{r.register_no ?? r.student_id_no}</div>
                  </div>
                  <div className="w-[130px] text-[12.5px] text-ink">
                    {r.department?.code ?? "—"} {r.semester ? `· Sem ${r.semester}` : ""}
                  </div>
                  <div className="w-[90px] text-[13px] font-bold text-ink">{r.attendance_pct}%</div>
                  <div className="w-[110px] text-[12.5px] text-ink">{r.shortfall_courses} courses</div>
                  <div className="w-[110px]">
                    {r.condonation_status ? <Badge tone={r.condonation_status === "approved" ? "accentDark" : r.condonation_status === "rejected" ? "danger" : "accent"}>{r.condonation_status.toUpperCase()}</Badge> : <span className="text-[12px] text-subtle">—</span>}
                  </div>
                  <div className="w-[100px]">
                    <Badge tone={TONE[r.eligibility]}>{r.eligibility.toUpperCase()}</Badge>
                  </div>
                  <div className="flex w-[200px] shrink-0 justify-end gap-2">
                    {r.condonation_status === "requested" && r.condonation_id ? (
                      <>
                        <Button variant="primarySmall" className="w-auto px-3 py-1.5 text-[12px]" onClick={() => reviewCondonation.mutate({ id: r.condonation_id!, status: "approved" })}>
                          Approve
                        </Button>
                        <Button variant="secondary" className="w-auto px-3 py-1.5 text-[12px]" onClick={() => reviewCondonation.mutate({ id: r.condonation_id!, status: "rejected" })}>
                          Reject
                        </Button>
                      </>
                    ) : r.eligibility === "detained" && !r.condonation_status ? (
                      <Button
                        variant="secondary"
                        className="w-auto px-3 py-1.5 text-[12px]"
                        disabled={!effectiveExamId || createCondonation.isPending}
                        onClick={() => effectiveExamId && createCondonation.mutate({ student_id: r.id, exam_id: effectiveExamId })}
                      >
                        New condonation
                      </Button>
                    ) : (
                      <Link href={`/coe/student-exam-record/${r.id}`} className="text-[12px] font-bold text-primary hover:underline">
                        View
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
