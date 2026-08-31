"use client";

import { useState } from "react";
import { Card, StatCard, SearchBar, Select, Button, Badge, Banner, Modal, Pagination, DEFAULT_PAGE_SIZE } from "@/components/ui";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils/cn";
import { CoePageHeader } from "@/modules/coe/PageHeader";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { downloadCsv } from "@/lib/utils/csv";
import { useExams } from "@/modules/coe/api/exams";
import { useDepartments } from "@/modules/coe/api/reference";
import { useRegulations, type Regulation } from "@/modules/coe/api/regulations";
import { useAllScriptBundles } from "@/modules/coe/api/scriptBundles";
import {
  useCourseResults,
  useCourseResultStats,
  useComputeCourseResult,
  useApproveCourseResult,
  usePublishCourseResult,
  useCourseResultAnalysis,
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

const STATUS_TONE: Record<CourseResultStatus, "accent" | "accentDark" | "neutral"> = {
  published: "accentDark",
  approved: "accentDark",
  computed: "accent",
  awaiting_pass_board: "neutral",
};
const STATUS_LABEL: Record<CourseResultStatus, string> = { published: "Published", approved: "Approved", computed: "Computed", awaiting_pass_board: "Pending" };
const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

export default function CoeResultsManagementPage() {
  const exams = useExams();
  const departments = useDepartments();

  const allScriptBundles = useAllScriptBundles();
  const counts = new Map<number, number>();
  for (const b of allScriptBundles.data ?? []) counts.set(b.exam_id, (counts.get(b.exam_id) ?? 0) + 1);
  let busiestExamId: number | null = null;
  let bestCount = 0;
  for (const [id, count] of counts) {
    if (count > bestCount) {
      busiestExamId = id;
      bestCount = count;
    }
  }
  const effectiveExamId = busiestExamId ?? [...(exams.data ?? [])].sort((a, b) => b.id - a.id)[0]?.id ?? null;

  const [tab, setTab] = useState<TabKey>("all");
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [semester, setSemester] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  function changeFilter<T>(setter: (v: T) => void, value: T) {
    setter(value);
    setPage(1);
  }

  const [computeOpen, setComputeOpen] = useState(false);
  const [analysisMapping, setAnalysisMapping] = useState<CourseResultRow | null>(null);

  const stats = useCourseResultStats(effectiveExamId);
  const allResults = useCourseResults(effectiveExamId, {});
  const allRows = allResults.data ?? [];
  const [rowError, setRowError] = useState<string | null>(null);

  const tabCounts = {
    all: allRows.length,
    computed: allRows.filter((r) => r.status === "computed").length,
    awaiting_pass_board: allRows.filter((r) => r.status === "awaiting_pass_board").length,
    published: allRows.filter((r) => r.status === "published").length,
  };

  const filtered = allRows.filter((r) => {
    if (tab !== "all" && r.status !== tab) return false;
    if (departmentId != null && r.department_id !== departmentId) return false;
    if (semester != null && r.semester !== semester) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      if (!r.subject.name.toLowerCase().includes(q) && !r.subject.subject_code.toLowerCase().includes(q)) return false;
    }
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / DEFAULT_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * DEFAULT_PAGE_SIZE, safePage * DEFAULT_PAGE_SIZE);

  const pendingCompute = allRows.filter((r) => r.status === "awaiting_pass_board");

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
      filtered,
    );
  }

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <CoePageHeader
        title="Results Management"
        subtitle="Grade and GPA computation, moderation, pass board approval and result publication."
        actions={
          <>
            <Button variant="secondary" className="w-auto inline-flex items-center gap-1.5" onClick={handleExport}>
              <Icon name="download" size={16} />
              Export
            </Button>
            <Button
              variant="primarySmall"
              className="inline-flex items-center gap-1.5 px-5 py-3"
              disabled={pendingCompute.length === 0}
              onClick={() => setComputeOpen(true)}
            >
              <Icon name="add" size={16} />
              Compute results
            </Button>
          </>
        }
      />

      {rowError && (
        <Banner className="border-danger-border bg-danger-bg text-danger-fg">
          <div className="flex items-center justify-between gap-3">
            <span>{rowError}</span>
            <button type="button" className="font-bold hover:underline" onClick={() => setRowError(null)}>
              Dismiss
            </button>
          </div>
        </Banner>
      )}

      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Results published"
          value={stats.data?.published_count ?? 0}
          icon="workspace_premium"
          sub={stats.data?.total_courses ? `${Math.round((stats.data.published_count / stats.data.total_courses) * 1000) / 10}% of courses` : undefined}
        />
        <StatCard
          label="Overall pass %"
          value={`${stats.data?.overall_pass_pct ?? 0}%`}
          icon="trending_up"
          sub={stats.data?.pass_pct_delta != null ? `${stats.data.pass_pct_delta >= 0 ? "+" : ""}${stats.data.pass_pct_delta} vs last cycle` : undefined}
        />
        <StatCard
          label="Awaiting approval"
          value={stats.data?.awaiting_approval_count ?? 0}
          icon="hourglass_empty"
          sub={stats.data?.board_meeting_at ? `board on ${new Date(stats.data.board_meeting_at).toLocaleDateString()}` : undefined}
        />
        <StatCard
          label="Withheld results"
          value={stats.data?.withheld_count ?? 0}
          icon="block"
          sub={
            stats.data && stats.data.withheld_count > 0
              ? [stats.data.withheld_malpractice_count > 0 && "malpractice", stats.data.withheld_other_count > 0 && "other holds"].filter(Boolean).join(" & ")
              : undefined
          }
        />
      </div>

      <Card className="p-0">
        <div className="flex items-center gap-7 border-b border-divider px-5 pt-4">
          {TABS.map((t) => {
            const active = t.key === tab;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => changeFilter(setTab, t.key)}
                className={cn(
                  "-mb-px flex items-center gap-2 border-b-2 pb-3 text-[14px] font-bold transition-colors",
                  active ? "border-primary text-primary" : "border-transparent text-muted hover:text-ink",
                )}
              >
                {t.label}
                <span className={cn("rounded-full px-2 py-0.5 text-[11.5px] font-bold", active ? "bg-accent-50 text-primary" : "bg-surface-tint text-muted")}>
                  {tabCounts[t.key]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3 border-b border-divider px-5 py-4">
          <SearchBar placeholder="Search course or programme…" value={search} onChange={(e) => changeFilter(setSearch, e.target.value)} className="max-w-[300px]" />
          <Select value={departmentId ?? ""} onChange={(e) => changeFilter(setDepartmentId, e.target.value ? Number(e.target.value) : null)} className="w-auto min-w-[150px]">
            <option value="">All departments</option>
            {(departments.data ?? []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.code}
              </option>
            ))}
          </Select>
          <Select value={semester ?? ""} onChange={(e) => changeFilter(setSemester, e.target.value ? Number(e.target.value) : null)} className="w-auto min-w-[140px]">
            <option value="">All semesters</option>
            {SEMESTERS.map((s) => (
              <option key={s} value={s}>
                Semester {s}
              </option>
            ))}
          </Select>
          <Select value={tab} onChange={(e) => changeFilter(setTab, e.target.value as TabKey)} className="w-auto min-w-[150px]">
            <option value="all">All status</option>
            <option value="computed">Computed</option>
            <option value="awaiting_pass_board">Pending</option>
            <option value="published">Published</option>
          </Select>
          <span className="ml-auto text-[13px] text-muted">{filtered.length} records</span>
        </div>

        {allResults.isLoading ? (
          <div className="p-5">
            <SkeletonTable rows={6} />
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-5 py-6 text-[13px] text-subtle">No courses match the current filters.</p>
        ) : (
          <>
          <div className="flex flex-col">
            <div className="flex items-center gap-4 border-b border-divider bg-surface-subtle px-5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">
              <div className="flex-1">Course</div>
              <div className="w-[90px]">Appeared</div>
              <div className="w-[90px]">Passed</div>
              <div className="w-[80px]">Pass %</div>
              <div className="w-[100px]">Highest GPA</div>
              <div className="w-[110px]">Status</div>
              <div className="w-[80px] text-right"> </div>
            </div>
            {pageRows.map((r) => (
              <div key={r.exam_subject_mapping_id} className="flex items-center gap-4 border-b border-divider px-5 py-4 last:border-0">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-bold text-ink">
                    {r.subject.subject_code} · {r.subject.name}
                  </div>
                  <div className="truncate text-[11.5px] text-muted">
                    {r.department?.code ?? "—"} · Semester {r.semester ?? "—"}
                    {r.withheld_reason && <span className="text-danger-fg"> · {r.withheld_reason}</span>}
                  </div>
                </div>
                <div className="w-[90px] shrink-0 text-[12.5px] text-ink">{r.appeared}</div>
                <div className="w-[90px] shrink-0 text-[12.5px] text-ink">{r.passed}</div>
                <div className="w-[80px] shrink-0 text-[13px] font-bold text-ink">{r.pass_pct}%</div>
                <div className="w-[100px] shrink-0 text-[12.5px] text-ink">{r.highest_gpa ?? "—"}</div>
                <div className="w-[110px] min-w-0 shrink-0">
                  <Badge tone={STATUS_TONE[r.status]} className="max-w-full truncate">
                    {STATUS_LABEL[r.status]}
                  </Badge>
                </div>
                <div className="flex w-[80px] shrink-0 justify-end">
                  {r.status === "awaiting_pass_board" ? (
                    <ComputeOneLink mapping={r} onError={setRowError} />
                  ) : r.status === "computed" ? (
                    <ApproveOneLink mapping={r} onError={setRowError} />
                  ) : r.status === "approved" ? (
                    <PublishOneLink mapping={r} onError={setRowError} />
                  ) : (
                    <button type="button" className="text-[12.5px] font-bold text-primary hover:underline" onClick={() => setAnalysisMapping(r)}>
                      Analysis
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <Pagination page={safePage} pageSize={DEFAULT_PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
          </>
        )}
      </Card>

      <ComputeResultsModal open={computeOpen} onClose={() => setComputeOpen(false)} filteredPending={filtered.filter((r) => r.status === "awaiting_pass_board")} allPending={pendingCompute} />
      <AnalysisModal mapping={analysisMapping} onClose={() => setAnalysisMapping(null)} />
    </div>
  );
}

// Each of these owns its own mutation instance so clicking one row's action
// can never disable or affect any other row's buttons — a shared instance at
// the page level was the earlier bug (isPending flipped true for every row).
function ComputeOneLink({ mapping, onError }: { mapping: CourseResultRow; onError: (message: string) => void }) {
  const compute = useComputeCourseResult();
  async function handleClick() {
    try {
      await compute.mutateAsync(mapping.exam_subject_mapping_id);
    } catch (err) {
      onError((err as Error).message || `Could not compute results for ${mapping.subject.subject_code}.`);
    }
  }
  return (
    <button type="button" className="text-[12.5px] font-bold text-primary hover:underline disabled:opacity-40" disabled={compute.isPending} onClick={handleClick}>
      {compute.isPending ? "Computing…" : "Compute"}
    </button>
  );
}

function ApproveOneLink({ mapping, onError }: { mapping: CourseResultRow; onError: (message: string) => void }) {
  const approve = useApproveCourseResult();
  async function handleClick() {
    try {
      await approve.mutateAsync(mapping.exam_subject_mapping_id);
    } catch (err) {
      onError((err as Error).message || `Could not approve ${mapping.subject.subject_code}.`);
    }
  }
  return (
    <button type="button" className="text-[12.5px] font-bold text-primary hover:underline disabled:opacity-40" disabled={approve.isPending} onClick={handleClick}>
      {approve.isPending ? "Approving…" : "Approve"}
    </button>
  );
}

function PublishOneLink({ mapping, onError }: { mapping: CourseResultRow; onError: (message: string) => void }) {
  const publish = usePublishCourseResult();
  async function handleClick() {
    try {
      await publish.mutateAsync(mapping.exam_subject_mapping_id);
    } catch (err) {
      onError((err as Error).message || `Could not publish ${mapping.subject.subject_code}.`);
    }
  }
  return (
    <button type="button" className="text-[12.5px] font-bold text-primary hover:underline disabled:opacity-40" disabled={publish.isPending} onClick={handleClick}>
      {publish.isPending ? "Publishing…" : "Publish"}
    </button>
  );
}

type Scope = "selected" | "all";
type PublishMode = "hold" | "immediate";

function ComputeResultsModal({
  open,
  onClose,
  filteredPending,
  allPending,
}: {
  open: boolean;
  onClose: () => void;
  filteredPending: CourseResultRow[];
  allPending: CourseResultRow[];
}) {
  const regulations = useRegulations({});
  const compute = useComputeCourseResult();
  const approve = useApproveCourseResult();
  const publish = usePublishCourseResult();

  const [scope, setScope] = useState<Scope>("selected");
  const [regulationId, setRegulationId] = useState<string>("");
  const [publishMode, setPublishMode] = useState<PublishMode>("hold");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targets = scope === "selected" ? filteredPending : allPending;
  const selectedRegulation = regulations.data?.find((r) => String(r.id) === regulationId) ?? null;

  function reset() {
    setScope("selected");
    setRegulationId("");
    setPublishMode("hold");
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleRun() {
    setError(null);
    setRunning(true);
    try {
      for (const r of targets) {
        await compute.mutateAsync(r.exam_subject_mapping_id);
        if (publishMode === "immediate") {
          await approve.mutateAsync(r.exam_subject_mapping_id);
          await publish.mutateAsync(r.exam_subject_mapping_id);
        }
      }
      handleClose();
    } catch (err) {
      setError((err as Error).message || "Could not compute results for one or more courses.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Compute results" subtitle="Runs grade computation from real entered marks, then queues the pass board sheet.">
      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Scope</label>
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value as Scope)}
            className="w-full rounded-input border border-border-default bg-surface px-3 py-2.5 text-sm text-ink focus:border-border-accent focus:outline-none"
          >
            <option value="selected">Selected courses ({filteredPending.length} matching current filters)</option>
            <option value="all">All courses awaiting compute ({allPending.length})</option>
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Regulation</label>
          <select
            value={regulationId}
            onChange={(e) => setRegulationId(e.target.value)}
            className="w-full rounded-input border border-border-default bg-surface px-3 py-2.5 text-sm text-ink focus:border-border-accent focus:outline-none"
          >
            <option value="">All regulations</option>
            {(regulations.data ?? []).map((r: Regulation) => (
              <option key={r.id} value={r.id}>
                {r.code} · {r.grading_scale}
              </option>
            ))}
          </select>
          {selectedRegulation && <p className="mt-1.5 text-[12px] text-subtle">Shown for reference — grading itself uses the institution&apos;s grade bands, not a per-regulation scheme.</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Publish after approval</label>
          <select
            value={publishMode}
            onChange={(e) => setPublishMode(e.target.value as PublishMode)}
            className="w-full rounded-input border border-border-default bg-surface px-3 py-2.5 text-sm text-ink focus:border-border-accent focus:outline-none"
          >
            <option value="hold">Hold for pass board</option>
            <option value="immediate">Publish immediately</option>
          </select>
        </div>

        {error && <p className="text-[12px] text-danger-fg">{error}</p>}

        <div className="flex gap-3 border-t border-divider pt-5">
          <Button variant="primarySmall" className="flex-[2] py-3" disabled={targets.length === 0 || running} onClick={handleRun}>
            {running ? "Computing…" : `Compute ${targets.length} course${targets.length === 1 ? "" : "s"}`}
          </Button>
          <Button variant="secondary" className="w-auto flex-1" onClick={handleClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function AnalysisModal({ mapping, onClose }: { mapping: CourseResultRow | null; onClose: () => void }) {
  const analysis = useCourseResultAnalysis(mapping?.exam_subject_mapping_id ?? null);

  return (
    <Modal
      open={mapping != null}
      onClose={onClose}
      title={mapping ? `${mapping.subject.subject_code} · ${mapping.subject.name}` : ""}
      subtitle="Grade distribution and score spread for this course."
    >
      {analysis.isLoading ? (
        <p className="text-[13px] text-subtle">Loading…</p>
      ) : !analysis.data ? (
        <p className="text-[13px] text-subtle">No data available.</p>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 text-[12.5px]">
            {[
              ["Appeared", analysis.data.total_appeared],
              ["Absent", analysis.data.absent],
              ["Passed", analysis.data.passed],
              ["Failed", analysis.data.failed],
              ["Average", `${analysis.data.average_marks} / ${analysis.data.max_marks}`],
              ["Highest", analysis.data.highest_marks ?? "—"],
              ["Lowest", analysis.data.lowest_marks ?? "—"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between border-b border-divider pb-2">
                <span className="font-bold text-muted">{label}</span>
                <span className="text-ink">{value}</span>
              </div>
            ))}
          </div>

          <div>
            <div className="mb-2 text-[13px] font-bold text-ink">Grade distribution</div>
            <div className="flex flex-col gap-1.5">
              {analysis.data.grade_distribution.map((g) => (
                <div key={g.grade} className="flex items-center gap-3">
                  <span className="w-8 text-[12.5px] font-bold text-ink">{g.grade}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-tint">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${analysis.data!.total_appeared > 0 ? (g.count / analysis.data!.total_appeared) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-[12px] text-muted">{g.count}</span>
                </div>
              ))}
            </div>
          </div>

          <Button variant="secondary" className="w-auto self-end" onClick={onClose}>
            Close
          </Button>
        </div>
      )}
    </Modal>
  );
}
