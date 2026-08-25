"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, StatCard, PillTabs, SearchBar, Select, Button, Badge, type BadgeTone } from "@/components/ui";
import { CoePageHeader } from "@/modules/coe/PageHeader";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { downloadCsv } from "@/lib/utils/csv";
import { useExams } from "@/modules/coe/api/exams";
import { useDepartments } from "@/modules/coe/api/reference";
import { useAllScriptBundles } from "@/modules/coe/api/scriptBundles";
import {
  useCourseResults,
  useCourseResultStats,
  useComputeCourseResult,
  useApproveCourseResult,
  usePublishCourseResult,
  type CourseResultStatus,
  type CourseResultRow,
} from "@/modules/coe/api/courseResults";

type TabKey = "all" | "computed" | "awaiting_pass_board" | "published";
const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All courses" },
  { key: "computed", label: "Computed" },
  { key: "awaiting_pass_board", label: "Awaiting pass board" },
  { key: "published", label: "Published" },
];

const TONE: Record<CourseResultStatus, BadgeTone> = { published: "accentDark", approved: "accent", computed: "neutral", awaiting_pass_board: "danger" };
const STATUS_LABEL: Record<CourseResultStatus, string> = { published: "Published", approved: "Approved", computed: "Pending", awaiting_pass_board: "Awaiting pass board" };
const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

export default function CoeResultsManagementPage() {
  const router = useRouter();
  const exams = useExams();
  const departments = useDepartments();
  const [examId, setExamId] = useState<number | null>(null);
  const [tab, setTab] = useState<TabKey>("all");
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [semester, setSemester] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | CourseResultStatus>("all");
  const [search, setSearch] = useState("");
  const [bulkComputing, setBulkComputing] = useState(false);

  // Defaulting to the highest-id exam often lands on one with zero real
  // results computed yet; default instead to whichever exam actually has
  // the most script bundles (and therefore real exam_marks), so the page
  // shows real data out of the box.
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
  const stats = useCourseResultStats(effectiveExamId);
  const allResults = useCourseResults(effectiveExamId, {});
  const results = useCourseResults(effectiveExamId, {
    department_id: departmentId,
    semester,
    status: statusFilter === "all" ? null : statusFilter,
    search,
  });
  const compute = useComputeCourseResult();
  const approve = useApproveCourseResult();
  const publish = usePublishCourseResult();

  const rows = useMemo(() => (results.data ?? []).filter((r) => tab === "all" || r.status === tab), [results.data, tab]);
  const tabCounts = useMemo(() => {
    const all = allResults.data ?? [];
    return {
      all: all.length,
      computed: all.filter((r) => r.status === "computed").length,
      awaiting_pass_board: all.filter((r) => r.status === "awaiting_pass_board").length,
      published: all.filter((r) => r.status === "published").length,
    };
  }, [allResults.data]);

  const pendingCompute = (allResults.data ?? []).filter((r) => r.status === "awaiting_pass_board");

  async function handleComputeAll() {
    if (pendingCompute.length === 0) return;
    setBulkComputing(true);
    try {
      for (const r of pendingCompute) await compute.mutateAsync(r.exam_subject_mapping_id);
    } finally {
      setBulkComputing(false);
    }
  }

  function handleExport() {
    downloadCsv(
      "results-management",
      [
        { header: "Course", value: (r: CourseResultRow) => `${r.subject.subject_code} · ${r.subject.name}` },
        { header: "Department", value: (r: CourseResultRow) => r.department?.code ?? "" },
        { header: "Semester", value: (r: CourseResultRow) => r.semester ?? "" },
        { header: "Appeared", value: (r: CourseResultRow) => r.appeared },
        { header: "Passed", value: (r: CourseResultRow) => r.passed },
        { header: "Pass %", value: (r: CourseResultRow) => r.pass_pct },
        { header: "Highest GPA", value: (r: CourseResultRow) => r.highest_gpa ?? "" },
        { header: "Status", value: (r: CourseResultRow) => STATUS_LABEL[r.status] },
        { header: "Withheld reason", value: (r: CourseResultRow) => r.withheld_reason ?? "" },
      ],
      rows,
    );
  }

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <CoePageHeader
        title="Results Management"
        subtitle="Grade and GPA computation, moderation, pass board approval and result publication."
        actions={
          <>
            <Select value={effectiveExamId ?? ""} onChange={(e) => setExamId(Number(e.target.value))} className="w-56">
              {[...(exams.data ?? [])].sort((a, b) => b.id - a.id).map((e) => (
                <option key={e.id} value={e.id}>
                  {e.exam_category} · {e.academic_year} · Sem {e.semester}
                </option>
              ))}
            </Select>
            <Button variant="secondary" className="w-auto" disabled={rows.length === 0} onClick={handleExport}>
              Export
            </Button>
            <Button variant="primarySmall" className="w-auto" disabled={pendingCompute.length === 0 || bulkComputing} onClick={handleComputeAll}>
              {bulkComputing ? "Computing…" : `Compute results${pendingCompute.length ? ` (${pendingCompute.length})` : ""}`}
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Results published"
          value={stats.data?.published_count ?? (stats.isLoading ? "…" : 0)}
          icon="workspace_premium"
          sub={stats.data && stats.data.total_courses > 0 ? `${Math.round((stats.data.published_count / stats.data.total_courses) * 1000) / 10}% of courses` : undefined}
        />
        <StatCard
          label="Overall pass %"
          value={`${stats.data?.overall_pass_pct ?? 0}%`}
          icon="trending_up"
          sub={stats.data?.pass_pct_delta != null ? `${stats.data.pass_pct_delta >= 0 ? "+" : ""}${stats.data.pass_pct_delta} vs last cycle` : undefined}
        />
        <StatCard
          label="Awaiting approval"
          value={stats.data?.awaiting_approval_count ?? (stats.isLoading ? "…" : 0)}
          icon="hourglass_empty"
          sub={stats.data?.board_meeting_at ? `board on ${new Date(stats.data.board_meeting_at).toLocaleDateString()}` : undefined}
        />
        <StatCard
          label="Withheld results"
          value={stats.data?.withheld_count ?? (stats.isLoading ? "…" : 0)}
          icon="block"
          sub={
            stats.data && stats.data.withheld_count > 0
              ? [stats.data.withheld_malpractice_count > 0 && "malpractice", stats.data.withheld_other_count > 0 && "other holds"].filter(Boolean).join(" & ")
              : undefined
          }
        />
      </div>

      <Card>
        <div className="flex flex-col gap-3">
          <PillTabs options={TABS.map((t) => ({ ...t, label: `${t.label} (${tabCounts[t.key]})` }))} value={tab} onChange={(k) => setTab(k as typeof tab)} />
          <div className="flex flex-wrap items-center gap-3">
            <SearchBar placeholder="Search course or programme…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-[260px]" />
            <Select value={departmentId ?? ""} onChange={(e) => setDepartmentId(e.target.value ? Number(e.target.value) : null)} className="w-auto min-w-[140px]">
              <option value="">All departments</option>
              {(departments.data ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code}
                </option>
              ))}
            </Select>
            <Select value={semester ?? ""} onChange={(e) => setSemester(e.target.value ? Number(e.target.value) : null)} className="w-auto min-w-[130px]">
              <option value="">All semesters</option>
              {SEMESTERS.map((s) => (
                <option key={s} value={s}>
                  Semester {s}
                </option>
              ))}
            </Select>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="w-auto min-w-[150px]">
              <option value="all">All status</option>
              {(["computed", "awaiting_pass_board", "approved", "published"] as CourseResultStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </Card>

      {results.isLoading ? (
        <SkeletonTable rows={6} />
      ) : (
        <Card className="p-0">
          <div className="flex items-center justify-between border-b border-divider px-5 py-3.5">
            <span className="text-[15px] font-extrabold text-ink">Courses</span>
            <span className="text-[12.5px] text-muted">{rows.length} records</span>
          </div>
          {rows.length === 0 ? (
            <p className="px-5 py-6 text-[13px] text-subtle">No courses match the current filter.</p>
          ) : (
            <div className="flex flex-col">
              <div className="flex items-center justify-between gap-4 border-b border-divider bg-surface-subtle px-5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">
                <div className="flex-1">Course</div>
                <div className="w-[80px]">Appeared</div>
                <div className="w-[80px]">Passed</div>
                <div className="w-[80px]">Pass %</div>
                <div className="w-[90px]">Highest GPA</div>
                <div className="w-[150px]">Status</div>
                <div className="w-[110px] text-right">Actions</div>
              </div>
              {rows.map((r) => (
                <div key={r.exam_subject_mapping_id} className="flex items-center justify-between gap-4 border-b border-divider px-5 py-4 last:border-0">
                  <div className="flex-1">
                    <div className="text-[13.5px] font-bold text-ink">
                      {r.subject.subject_code} · {r.subject.name}
                    </div>
                    <div className="text-[11.5px] text-muted">
                      {r.department?.code ?? "—"} · Sem {r.semester ?? "—"}
                      {r.withheld_reason && <span className="text-danger-fg"> · {r.withheld_reason}</span>}
                    </div>
                  </div>
                  <div className="w-[80px] text-[12.5px] text-ink">{r.appeared}</div>
                  <div className="w-[80px] text-[12.5px] text-ink">{r.passed}</div>
                  <div className="w-[80px] text-[13px] font-bold text-ink">{r.pass_pct}%</div>
                  <div className="w-[90px] text-[12.5px] text-ink">{r.highest_gpa ?? "—"}</div>
                  <div className="w-[150px]">
                    <Badge tone={TONE[r.status]}>{STATUS_LABEL[r.status].toUpperCase()}</Badge>
                  </div>
                  <div className="w-[110px] text-right">
                    {r.status === "awaiting_pass_board" ? (
                      <Button variant="secondary" className="w-auto px-3 py-1.5 text-[12px]" disabled={compute.isPending} onClick={() => compute.mutate(r.exam_subject_mapping_id)}>
                        Compute
                      </Button>
                    ) : r.status === "computed" ? (
                      <Button variant="primarySmall" className="w-auto px-3 py-1.5 text-[12px]" disabled={approve.isPending} onClick={() => approve.mutate(r.exam_subject_mapping_id)}>
                        Approve
                      </Button>
                    ) : r.status === "approved" ? (
                      <Button variant="primarySmall" className="w-auto px-3 py-1.5 text-[12px]" disabled={publish.isPending} onClick={() => publish.mutate(r.exam_subject_mapping_id)}>
                        Publish
                      </Button>
                    ) : (
                      <button
                        type="button"
                        className="text-[12.5px] font-bold text-primary hover:underline"
                        onClick={() => router.push(`/coe/pass-board?exam_id=${effectiveExamId}`)}
                      >
                        Analysis
                      </button>
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
