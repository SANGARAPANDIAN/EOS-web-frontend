"use client";

import { useEffect, useState } from "react";
import { Card, StatCard, SearchBar, Select, Button, Badge, Modal, Pagination, DEFAULT_PAGE_SIZE } from "@/components/ui";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils/cn";
import { CoePageHeader } from "@/modules/coe/PageHeader";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { downloadCsv } from "@/lib/utils/csv";
import { formatDate, formatNumber, formatCompactCurrency } from "@/lib/utils/format";
import { useDepartments } from "@/modules/shared/api/departments";
import { useExamMarks } from "@/modules/coe/api/marks";
import { useLookupStudentByRegisterNo, isNotFound } from "@/modules/coe/api/malpractice";
import { useRevaluationWindow } from "@/modules/coe/api/revaluationWindow";
import {
  useRevaluationRequests,
  useUpdateRevaluationRequest,
  useCreateRevaluationRequest,
  useRemindRevaluationRequest,
  type RevaluationRequest,
  type RevaluationStatus,
} from "@/modules/coe/api/revaluation";
import {
  usePhotocopyRequests,
  useUpdatePhotocopyRequest,
  useCreatePhotocopyRequest,
  type PhotocopyRequest,
  type PhotocopyStatus,
} from "@/modules/coe/api/photocopyRequests";

type AppType = "revaluation" | "retotaling" | "photocopy";
type Bucket = "pending" | "under_valuation" | "completed";
type Target = { kind: "revaluation" | "photocopy"; id: number };

const TYPE_OPTIONS: { value: "all" | AppType; label: string }[] = [
  { value: "all", label: "All types" },
  { value: "revaluation", label: "Revaluation" },
  { value: "retotaling", label: "Retotaling" },
  { value: "photocopy", label: "Photocopy" },
];

const TABS: { key: "all" | Bucket; label: string }[] = [
  { key: "all", label: "All applications" },
  { key: "pending", label: "Payment pending" },
  { key: "under_valuation", label: "Under valuation" },
  { key: "completed", label: "Result updated" },
];

const REV_STATUS_LABEL: Record<RevaluationStatus, string> = {
  requested: "Requested",
  under_review: "Under review",
  revised: "Revised",
  no_change: "No change",
  approved: "Approved",
  rejected: "Rejected",
};

const PC_STATUS_LABEL: Record<PhotocopyStatus, string> = {
  requested: "Requested",
  scanned: "Scanned",
  issued: "Issued",
  rejected: "Rejected",
};

const BUCKET_LABEL: Record<Bucket, string> = {
  pending: "Payment pending",
  under_valuation: "Under valuation",
  completed: "Result updated",
};

const BUCKET_TONE: Record<Bucket, "accent" | "accentDark" | "danger"> = {
  pending: "danger",
  under_valuation: "accent",
  completed: "accentDark",
};

function studentName(s: { soa_applications: { first_name: string; last_name: string | null } | null; register_no: string | null; student_id_no: string }): string {
  if (s.soa_applications) return [s.soa_applications.first_name, s.soa_applications.last_name].filter(Boolean).join(" ");
  return s.register_no ?? s.student_id_no;
}

/** Fee-paid gates everything: an unpaid application never reaches valuation, regardless of its raw status column. */
function revBucket(r: RevaluationRequest): Bucket {
  if (!r.fee_paid) return "pending";
  if (r.status === "approved" || r.status === "rejected") return "completed";
  return "under_valuation";
}

/** Photocopy fee is collected at the counter when the request is filed — there's no "payment pending" state for it. */
function pcBucket(p: PhotocopyRequest): Bucket {
  if (p.status === "issued" || p.status === "rejected") return "completed";
  return "under_valuation";
}

function applicationCode(kind: AppType, id: number): string {
  const prefix = kind === "revaluation" ? "REV" : kind === "retotaling" ? "RET" : "PC";
  return `${prefix}-${String(id).padStart(4, "0")}`;
}

interface UnifiedRow {
  key: string;
  kind: AppType;
  id: number;
  code: string;
  date: string;
  name: string;
  regNo: string;
  course: string;
  deptCode: string | null;
  feePaid: boolean;
  outcome: string;
  bucket: Bucket;
}

function toUnifiedRev(r: RevaluationRequest): UnifiedRow {
  return {
    key: `rv-${r.id}`,
    kind: r.request_kind,
    id: r.id,
    code: applicationCode(r.request_kind, r.id),
    date: r.requested_at,
    name: studentName(r.students),
    regNo: r.students.register_no ?? r.students.student_id_no,
    course: `${r.exam_marks.exam_subject_mapping.subjects.subject_code} · ${r.exam_marks.exam_subject_mapping.subjects.name}`,
    deptCode: r.exam_marks.exam_subject_mapping.classes?.departments.code ?? null,
    feePaid: !!r.fee_paid,
    outcome: r.revised_marks != null ? `${r.exam_marks.marks_obtained ?? "—"} → ${r.revised_marks}` : r.status === "no_change" ? "No change" : "Awaiting",
    bucket: revBucket(r),
  };
}

function toUnifiedPc(p: PhotocopyRequest): UnifiedRow {
  return {
    key: `pc-${p.id}`,
    kind: "photocopy",
    id: p.id,
    code: applicationCode("photocopy", p.id),
    date: p.applied_at,
    name: studentName(p.students),
    regNo: p.students.register_no ?? p.students.student_id_no,
    course: `${p.exam_marks.exam_subject_mapping.subjects.subject_code} · ${p.exam_marks.exam_subject_mapping.subjects.name}`,
    deptCode: p.exam_marks.exam_subject_mapping.classes?.departments.code ?? null,
    feePaid: true,
    outcome: "—",
    bucket: pcBucket(p),
  };
}

export default function CoeRevaluationRetotalingPage() {
  const departments = useDepartments();
  const revaluation = useRevaluationRequests();
  const photocopy = usePhotocopyRequests();

  const [tab, setTab] = useState<"all" | Bucket>("all");
  const [type, setType] = useState<"all" | AppType>("all");
  const [departmentCode, setDepartmentCode] = useState("all");
  const [search, setSearch] = useState("");
  const [newAppOpen, setNewAppOpen] = useState(false);
  const [viewTarget, setViewTarget] = useState<Target | null>(null);
  const [trackTarget, setTrackTarget] = useState<Target | null>(null);
  const [page, setPage] = useState(1);

  function changeFilter<T>(setter: (v: T) => void, value: T) {
    setter(value);
    setPage(1);
  }

  const revRows = revaluation.data ?? [];
  const pcRows = photocopy.data?.data ?? [];
  const isLoading = revaluation.isLoading || photocopy.isLoading;

  const allRows: UnifiedRow[] = [...revRows.map(toUnifiedRev), ...pcRows.map(toUnifiedPc)];

  const tabCounts = {
    all: allRows.length,
    pending: allRows.filter((r) => r.bucket === "pending").length,
    under_valuation: allRows.filter((r) => r.bucket === "under_valuation").length,
    completed: allRows.filter((r) => r.bucket === "completed").length,
  };

  const filtered = allRows.filter((row) => {
    if (tab !== "all" && row.bucket !== tab) return false;
    if (type !== "all" && row.kind !== type) return false;
    if (departmentCode !== "all" && row.deptCode !== departmentCode) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const hay = `${row.regNo} ${row.name} ${row.code}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / DEFAULT_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * DEFAULT_PAGE_SIZE, safePage * DEFAULT_PAGE_SIZE);

  const totalApplications = allRows.length;
  const feeRaised = revRows.reduce((sum, r) => sum + (r.fee_amount ?? 0), 0) + pcRows.reduce((sum, p) => sum + p.fee_amount, 0);
  const feeCollected = revRows.reduce((sum, r) => sum + (r.fee_paid ? (r.fee_amount ?? 0) : 0), 0) + pcRows.reduce((sum, p) => sum + p.fee_amount, 0);
  const feeCollectedPct = feeRaised > 0 ? Math.round((feeCollected / feeRaised) * 100) : null;

  const marksChanged = revRows.filter((r) => r.revised_marks != null).length;
  const processedCount = revRows.filter((r) => r.status === "approved" || r.status === "rejected").length + pcRows.filter((p) => p.status === "issued" || p.status === "rejected").length;
  const marksChangedPct = processedCount > 0 ? Math.round((marksChanged / processedCount) * 100) : null;

  const tatDays: number[] = [];
  for (const r of revRows) if (r.resolved_at) tatDays.push((new Date(r.resolved_at).getTime() - new Date(r.requested_at).getTime()) / 86_400_000);
  for (const p of pcRows) if (p.processed_at) tatDays.push((new Date(p.processed_at).getTime() - new Date(p.applied_at).getTime()) / 86_400_000);
  const avgTat = tatDays.length > 0 ? tatDays.reduce((a, b) => a + b, 0) / tatDays.length : null;

  // Auto-detect the exam with the most applications so the "window closes"
  // stat has a real window to point at, same pattern used elsewhere in COE.
  const examCounts = new Map<number, number>();
  for (const r of revRows) if (r.exam_id != null) examCounts.set(r.exam_id, (examCounts.get(r.exam_id) ?? 0) + 1);
  let busiestExamId: number | null = null;
  let busiestCount = 0;
  for (const [id, count] of examCounts) {
    if (count > busiestCount) {
      busiestCount = count;
      busiestExamId = id;
    }
  }
  const activeWindow = useRevaluationWindow(busiestExamId);

  function handleExport() {
    downloadCsv(
      "revaluation-retotaling",
      [
        { header: "Application", value: (r: UnifiedRow) => r.code },
        { header: "Date", value: (r: UnifiedRow) => formatDate(r.date) },
        { header: "Student", value: (r: UnifiedRow) => r.name },
        { header: "Register No", value: (r: UnifiedRow) => r.regNo },
        { header: "Course", value: (r: UnifiedRow) => r.course },
        { header: "Type", value: (r: UnifiedRow) => r.kind },
        { header: "Fee", value: (r: UnifiedRow) => (r.feePaid ? "Paid" : "Unpaid") },
        { header: "Outcome", value: (r: UnifiedRow) => r.outcome },
        { header: "Status", value: (r: UnifiedRow) => BUCKET_LABEL[r.bucket] },
      ],
      filtered,
    );
  }

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <CoePageHeader
        title="Revaluation & Retotaling"
        subtitle="Student applications, fee tracking, re-valuation allocation and revised result updates."
        actions={
          <>
            <Button variant="secondary" className="w-auto inline-flex items-center gap-1.5" onClick={handleExport}>
              <Icon name="download" size={16} />
              Export
            </Button>
            <Button variant="primarySmall" className="inline-flex items-center gap-1.5 px-5 py-3" onClick={() => setNewAppOpen(true)}>
              <Icon name="add" size={16} />
              New application
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Applications"
          value={formatNumber(totalApplications)}
          icon="autorenew"
          sub={activeWindow.data?.closes_at ? `window closes ${formatDate(activeWindow.data.closes_at)}` : undefined}
        />
        <StatCard
          label="Fee collected"
          value={formatCompactCurrency(feeCollected)}
          icon="payments"
          sub={feeCollectedPct != null ? `${feeCollectedPct}% of ${formatCompactCurrency(feeRaised)} raised` : undefined}
        />
        <StatCard
          label="Marks changed"
          value={formatNumber(marksChanged)}
          icon="difference"
          sub={marksChangedPct != null ? `${marksChangedPct}% of processed` : undefined}
        />
        <StatCard
          label="Average TAT"
          value={avgTat != null ? `${avgTat.toFixed(1)}d` : "—"}
          icon="hourglass_top"
          sub={avgTat != null ? `across ${tatDays.length} resolved` : "no resolved applications yet"}
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
          <SearchBar placeholder="Search roll number, name or application…" value={search} onChange={(e) => changeFilter(setSearch, e.target.value)} className="max-w-[280px]" />
          <Select value={type} onChange={(e) => changeFilter(setType, e.target.value as typeof type)} className="w-auto min-w-[140px]">
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <Select value={departmentCode} onChange={(e) => changeFilter(setDepartmentCode, e.target.value)} className="w-auto min-w-[150px]">
            <option value="all">All departments</option>
            {(departments.data ?? []).map((d) => (
              <option key={d.id} value={d.code}>
                {d.code}
              </option>
            ))}
          </Select>
          <span className="ml-auto text-[13px] text-muted">{filtered.length} records</span>
        </div>

        {isLoading ? (
          <div className="p-5">
            <SkeletonTable rows={6} />
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-5 py-6 text-[13px] text-subtle">No applications match the current filters.</p>
        ) : (
          <>
          <div className="flex flex-col">
            <div className="flex items-center gap-4 border-b border-divider bg-surface-subtle px-5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">
              <div className="w-[100px]">Application</div>
              <div className="w-[150px]">Student</div>
              <div className="flex-1">Course</div>
              <div className="w-[90px]">Type</div>
              <div className="w-[80px]">Fee</div>
              <div className="w-[140px]">Outcome</div>
              <div className="w-[130px]">Status</div>
              <div className="w-[100px] text-right">Action</div>
            </div>
            {pageRows.map((row) => (
              <div key={row.key} className="flex items-center gap-4 border-b border-divider px-5 py-4 last:border-0">
                <div className="w-[100px] min-w-0 shrink-0">
                  <div className="truncate text-[12.5px] font-extrabold text-ink">{row.code}</div>
                  <div className="text-[11px] text-muted">{formatDate(row.date)}</div>
                </div>
                <div className="w-[150px] min-w-0 shrink-0">
                  <div className="truncate text-[12.5px] font-bold text-ink">{row.name}</div>
                  <div className="truncate text-[11px] text-muted">{row.regNo}</div>
                </div>
                <div className="min-w-0 flex-1 truncate text-[12.5px] text-ink">{row.course}</div>
                <div className="w-[90px] min-w-0 shrink-0">
                  <Badge tone="neutral" className="max-w-full truncate">
                    {row.kind === "photocopy" ? "PHOTOCOPY" : row.kind.toUpperCase()}
                  </Badge>
                </div>
                <div className="w-[80px] min-w-0 shrink-0">
                  <Badge tone={row.feePaid ? "accentDark" : "danger"}>{row.feePaid ? "PAID" : "UNPAID"}</Badge>
                </div>
                <div className="w-[140px] min-w-0 shrink-0 truncate text-[12.5px] text-ink">{row.outcome}</div>
                <div className="w-[130px] min-w-0 shrink-0">
                  <Badge tone={BUCKET_TONE[row.bucket]} className="max-w-full truncate">
                    {BUCKET_LABEL[row.bucket]}
                  </Badge>
                </div>
                <div className="flex w-[100px] shrink-0 justify-end">
                  {row.bucket === "completed" && (
                    <button
                      type="button"
                      className="text-[12.5px] font-bold text-primary hover:underline"
                      onClick={() => setViewTarget({ kind: row.kind === "photocopy" ? "photocopy" : "revaluation", id: row.id })}
                    >
                      View
                    </button>
                  )}
                  {row.bucket === "under_valuation" && (
                    <button
                      type="button"
                      className="text-[12.5px] font-bold text-primary hover:underline"
                      onClick={() => setTrackTarget({ kind: row.kind === "photocopy" ? "photocopy" : "revaluation", id: row.id })}
                    >
                      Track
                    </button>
                  )}
                  {row.bucket === "pending" && row.kind !== "photocopy" && <RemindLink id={row.id} />}
                </div>
              </div>
            ))}
          </div>
          <Pagination page={safePage} pageSize={DEFAULT_PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
          </>
        )}
      </Card>

      <NewApplicationModal open={newAppOpen} onClose={() => setNewAppOpen(false)} />
      <ViewModal target={viewTarget} revRows={revRows} pcRows={pcRows} onClose={() => setViewTarget(null)} />
      <TrackModal target={trackTarget} revRows={revRows} pcRows={pcRows} onClose={() => setTrackTarget(null)} />
    </div>
  );
}

/** Independent per-row mutation instance — each Remind link tracks only its own pending/error state. */
function RemindLink({ id }: { id: number }) {
  const remind = useRemindRevaluationRequest();

  if (remind.isSuccess) {
    return <span className="text-[12.5px] font-bold text-primary-dark">Reminded</span>;
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        className="text-[12.5px] font-bold text-primary hover:underline disabled:opacity-50"
        disabled={remind.isPending}
        onClick={() => remind.mutate(id)}
      >
        {remind.isPending ? "Sending…" : "Remind"}
      </button>
      {remind.isError && <span className="text-[11px] text-danger-fg">{(remind.error as Error).message}</span>}
    </div>
  );
}

/** Pure read-only summary for a fully resolved application — View never changes anything. */
function ViewModal({
  target,
  revRows,
  pcRows,
  onClose,
}: {
  target: Target | null;
  revRows: RevaluationRequest[];
  pcRows: PhotocopyRequest[];
  onClose: () => void;
}) {
  const r = target?.kind === "revaluation" ? revRows.find((x) => x.id === target.id) : null;
  const p = target?.kind === "photocopy" ? pcRows.find((x) => x.id === target.id) : null;

  if (target && r) {
    const outcome = r.revised_marks != null ? `${r.exam_marks.marks_obtained ?? "—"} → ${r.revised_marks}` : "No change";
    return (
      <Modal
        open
        onClose={onClose}
        title={applicationCode(r.request_kind, r.id)}
        subtitle={`${studentName(r.students)} · ${r.exam_marks.exam_subject_mapping.subjects.subject_code}`}
      >
        <div className="flex flex-col gap-3 text-[13px]">
          {(
            [
              ["Applied on", formatDate(r.requested_at)],
              ["Resolved on", formatDate(r.resolved_at)],
              ["Fee", r.fee_amount != null ? `₹${r.fee_amount} · Paid` : "—"],
              ["Outcome", outcome],
              ["Final status", REV_STATUS_LABEL[r.status]],
              ["Evaluator", r.faculty ? `${r.faculty.first_name} ${r.faculty.last_name}` : "—"],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-4 border-b border-divider pb-2.5 last:border-0">
              <span className="font-bold text-muted">{label}</span>
              <span className="text-right text-ink">{value}</span>
            </div>
          ))}
          {r.remarks && <div className="rounded-input border border-border-default bg-surface-subtle p-3 text-ink">{r.remarks}</div>}
          <Button variant="secondary" className="mt-2 w-auto self-end" onClick={onClose}>
            Close
          </Button>
        </div>
      </Modal>
    );
  }

  if (target && p) {
    return (
      <Modal
        open
        onClose={onClose}
        title={applicationCode("photocopy", p.id)}
        subtitle={`${studentName(p.students)} · ${p.exam_marks.exam_subject_mapping.subjects.subject_code}`}
      >
        <div className="flex flex-col gap-3 text-[13px]">
          {(
            [
              ["Applied on", formatDate(p.applied_at)],
              ["Processed on", formatDate(p.processed_at)],
              ["Fee", `₹${p.fee_amount} · Paid`],
              ["Final status", PC_STATUS_LABEL[p.status]],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-4 border-b border-divider pb-2.5 last:border-0">
              <span className="font-bold text-muted">{label}</span>
              <span className="text-right text-ink">{value}</span>
            </div>
          ))}
          <Button variant="secondary" className="mt-2 w-auto self-end" onClick={onClose}>
            Close
          </Button>
        </div>
      </Modal>
    );
  }

  return null;
}

/** Houses the real workflow transitions (start review / enter revision / approve / reject, or scan / issue) behind a single "Track" entry point — each mutate() call here belongs to this one modal instance, so it never shares pending state with any other row. */
function TrackModal({
  target,
  revRows,
  pcRows,
  onClose,
}: {
  target: Target | null;
  revRows: RevaluationRequest[];
  pcRows: PhotocopyRequest[];
  onClose: () => void;
}) {
  const updateRev = useUpdateRevaluationRequest();
  const updatePc = useUpdatePhotocopyRequest();
  const [marksInput, setMarksInput] = useState("");

  const r = target?.kind === "revaluation" ? revRows.find((x) => x.id === target.id) : null;
  const p = target?.kind === "photocopy" ? pcRows.find((x) => x.id === target.id) : null;

  // Re-hydrate the draft input whenever a different application is opened.
  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    if (r) setMarksInput(r.revised_marks != null ? String(r.revised_marks) : "");
  }, [target?.id]);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  function handleClose() {
    updateRev.reset();
    updatePc.reset();
    onClose();
  }

  if (target && r) {
    const outcome = r.revised_marks != null ? `${r.exam_marks.marks_obtained ?? "—"} → ${r.revised_marks}` : r.status === "no_change" ? "No change" : "Awaiting valuation";
    return (
      <Modal
        open
        onClose={handleClose}
        title={applicationCode(r.request_kind, r.id)}
        subtitle={`${studentName(r.students)} · ${r.exam_marks.exam_subject_mapping.subjects.subject_code}`}
      >
        <div className="flex flex-col gap-4 text-[13px]">
          <div className="flex items-center justify-between border-b border-divider pb-2.5">
            <span className="font-bold text-muted">Current marks</span>
            <span className="text-ink">
              {r.exam_marks.marks_obtained ?? "—"} / {r.exam_marks.max_marks}
            </span>
          </div>
          <div className="flex items-center justify-between border-b border-divider pb-2.5">
            <span className="font-bold text-muted">Status</span>
            <span className="font-bold text-ink">{REV_STATUS_LABEL[r.status]}</span>
          </div>
          <div className="flex items-center justify-between border-b border-divider pb-2.5">
            <span className="font-bold text-muted">Outcome</span>
            <span className="text-ink">{outcome}</span>
          </div>
          {r.remarks && <div className="rounded-input border border-border-default bg-surface-subtle p-3 text-ink">{r.remarks}</div>}

          {r.status === "requested" && (
            <Button
              variant="primarySmall"
              className="w-auto self-end px-4 py-2 text-[12.5px]"
              disabled={updateRev.isPending}
              onClick={() => updateRev.mutate({ id: r.id, status: "under_review" })}
            >
              {updateRev.isPending ? "Starting…" : "Start review"}
            </Button>
          )}
          {r.status === "under_review" && (
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="mb-1.5 block text-[12.5px] font-bold text-ink">Revised marks</label>
                <input
                  value={marksInput}
                  onChange={(e) => setMarksInput(e.target.value)}
                  placeholder={`out of ${r.exam_marks.max_marks}`}
                  className="w-full rounded-input border border-border-default bg-surface px-3 py-2 text-sm text-ink placeholder:text-subtle focus:border-border-accent focus:outline-none"
                />
              </div>
              <Button
                variant="secondary"
                className="w-auto px-3 py-2.5 text-[12.5px]"
                disabled={updateRev.isPending}
                onClick={() => updateRev.mutate({ id: r.id, status: "no_change" })}
              >
                No change
              </Button>
              <Button
                variant="primarySmall"
                className="w-auto px-3 py-2.5 text-[12.5px]"
                disabled={updateRev.isPending || !marksInput.trim()}
                onClick={() => updateRev.mutate({ id: r.id, status: "revised", revised_marks: Number(marksInput) })}
              >
                Save revision
              </Button>
            </div>
          )}
          {(r.status === "revised" || r.status === "no_change") && (
            <div className="flex justify-end gap-2">
              <Button variant="secondary" className="w-auto px-4 py-2 text-[12.5px]" disabled={updateRev.isPending} onClick={() => updateRev.mutate({ id: r.id, status: "rejected" })}>
                Reject
              </Button>
              <Button variant="primarySmall" className="w-auto px-4 py-2 text-[12.5px]" disabled={updateRev.isPending} onClick={() => updateRev.mutate({ id: r.id, status: "approved" })}>
                Approve
              </Button>
            </div>
          )}

          {updateRev.isError && <p className="text-[12px] text-danger-fg">{(updateRev.error as Error).message}</p>}
        </div>
      </Modal>
    );
  }

  if (target && p) {
    return (
      <Modal
        open
        onClose={handleClose}
        title={applicationCode("photocopy", p.id)}
        subtitle={`${studentName(p.students)} · ${p.exam_marks.exam_subject_mapping.subjects.subject_code}`}
      >
        <div className="flex flex-col gap-4 text-[13px]">
          <div className="flex items-center justify-between border-b border-divider pb-2.5">
            <span className="font-bold text-muted">Status</span>
            <span className="font-bold text-ink">{PC_STATUS_LABEL[p.status]}</span>
          </div>
          <div className="flex items-center justify-between border-b border-divider pb-2.5">
            <span className="font-bold text-muted">Fee</span>
            <span className="text-ink">₹{p.fee_amount}</span>
          </div>

          {p.status === "requested" && (
            <div className="flex justify-end gap-2">
              <Button variant="secondary" className="w-auto px-4 py-2 text-[12.5px]" disabled={updatePc.isPending} onClick={() => updatePc.mutate({ id: p.id, status: "rejected" })}>
                Reject
              </Button>
              <Button variant="primarySmall" className="w-auto px-4 py-2 text-[12.5px]" disabled={updatePc.isPending} onClick={() => updatePc.mutate({ id: p.id, status: "scanned" })}>
                Mark scanned
              </Button>
            </div>
          )}
          {p.status === "scanned" && (
            <div className="flex justify-end">
              <Button variant="primarySmall" className="w-auto px-4 py-2 text-[12.5px]" disabled={updatePc.isPending} onClick={() => updatePc.mutate({ id: p.id, status: "issued" })}>
                Mark issued
              </Button>
            </div>
          )}

          {updatePc.isError && <p className="text-[12px] text-danger-fg">{(updatePc.error as Error).message}</p>}
        </div>
      </Modal>
    );
  }

  return null;
}

/** Counter entry for a walk-in student — every field routes to a real column; Payment mode never gets its own column (none exists) and only decides whether `fee_paid` is sent true. */
function NewApplicationModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const lookupStudent = useLookupStudentByRegisterNo();
  const createRev = useCreateRevaluationRequest();
  const createPc = useCreatePhotocopyRequest();

  const [rollNumber, setRollNumber] = useState("");
  const [lookedUpFor, setLookedUpFor] = useState("");
  const [examMarksId, setExamMarksId] = useState<number | "">("");
  const [appType, setAppType] = useState<AppType>("revaluation");
  const [paymentMode, setPaymentMode] = useState<"" | "cash" | "online" | "dd">("");
  const [remarks, setRemarks] = useState("");

  const studentId = lookupStudent.data?.id ?? null;
  const examMarks = useExamMarks(studentId);
  const selectedMark = (examMarks.data ?? []).find((m) => m.id === examMarksId) ?? null;
  const examId = selectedMark?.exam_subject_mapping.exam_id ?? null;
  const window_ = useRevaluationWindow(examId);
  const fee = appType === "photocopy" ? (window_.data?.photocopy_fee_per_paper ?? null) : (window_.data?.fee_per_paper ?? null);

  function handleRollBlur() {
    const value = rollNumber.trim();
    if (!value || value === lookedUpFor) return;
    setLookedUpFor(value);
    setExamMarksId("");
    lookupStudent.mutate(value);
  }

  function reset() {
    setRollNumber("");
    setLookedUpFor("");
    setExamMarksId("");
    setAppType("revaluation");
    setPaymentMode("");
    setRemarks("");
    lookupStudent.reset();
    createRev.reset();
    createPc.reset();
  }

  function handleClose() {
    reset();
    onClose();
  }

  const mutation = appType === "photocopy" ? createPc : createRev;

  function handleSave() {
    if (!studentId || !selectedMark || fee == null || !paymentMode) return;
    if (appType === "photocopy") {
      createPc.mutate({ exam_marks_id: selectedMark.id, student_id: studentId, fee_amount: fee }, { onSuccess: handleClose });
    } else {
      createRev.mutate(
        { exam_marks_id: selectedMark.id, student_id: studentId, request_kind: appType, remarks: remarks.trim() || undefined, fee_paid: true },
        { onSuccess: handleClose },
      );
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="New revaluation application"
      subtitle="Counter entry for a student applying for revaluation, retotaling or a photocopy of the answer script."
    >
      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Roll number *</label>
          <input
            type="text"
            value={rollNumber}
            onChange={(e) => setRollNumber(e.target.value)}
            onBlur={handleRollBlur}
            placeholder="e.g. 22ME118"
            className="w-full rounded-input border border-border-default bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-subtle focus:border-border-accent focus:outline-none"
          />
          {lookupStudent.isPending ? (
            <p className="mt-1.5 text-[12px] text-muted">Looking up…</p>
          ) : lookupStudent.data ? (
            <p className="mt-1.5 text-[12px] font-semibold text-primary">
              Found: {lookupStudent.data.name ?? lookupStudent.data.register_no} · {lookupStudent.data.department_code ?? "—"}
            </p>
          ) : lookupStudent.isError ? (
            <p className="mt-1.5 text-[12px] text-danger-fg">{isNotFound(lookupStudent.error) ? "No student found with this roll number." : (lookupStudent.error as Error).message}</p>
          ) : null}
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Course</label>
          <select
            value={examMarksId}
            onChange={(e) => setExamMarksId(e.target.value ? Number(e.target.value) : "")}
            disabled={!studentId}
            className="w-full rounded-input border border-border-default bg-surface px-3 py-2.5 text-sm text-ink focus:border-border-accent focus:outline-none disabled:opacity-50"
          >
            <option value="">{studentId ? "Choose a course…" : "Look up a student first"}</option>
            {(examMarks.data ?? []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.exam_subject_mapping.subjects.subject_code} · {m.exam_subject_mapping.subjects.name} ({m.exam_subject_mapping.exams.academic_year} Sem {m.exam_subject_mapping.exams.semester})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Application type</label>
          <select
            value={appType}
            onChange={(e) => setAppType(e.target.value as AppType)}
            className="w-full rounded-input border border-border-default bg-surface px-3 py-2.5 text-sm text-ink focus:border-border-accent focus:outline-none"
          >
            <option value="revaluation">Revaluation</option>
            <option value="retotaling">Retotaling</option>
            <option value="photocopy">Photocopy of answer script</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-[13px] font-bold text-ink">Fee</label>
            <div className="rounded-input border border-border-default bg-surface-subtle px-3 py-2.5 text-sm text-ink">
              {!examId ? "—" : window_.isLoading ? "Loading…" : fee != null ? `₹${fee}` : "No window configured for this exam"}
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-bold text-ink">Payment mode</label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value as typeof paymentMode)}
              className="w-full rounded-input border border-border-default bg-surface px-3 py-2.5 text-sm text-ink focus:border-border-accent focus:outline-none"
            >
              <option value="">Select…</option>
              <option value="cash">Cash</option>
              <option value="online">Online</option>
              <option value="dd">Demand draft</option>
            </select>
          </div>
        </div>

        {appType !== "photocopy" && (
          <div>
            <label className="mb-1.5 block text-[13px] font-bold text-ink">Remarks</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={2}
              placeholder="Reason for the application, portions to be re-checked, etc."
              className="w-full resize-y rounded-input border border-border-default bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-subtle focus:border-border-accent focus:outline-none"
            />
          </div>
        )}

        <p className="text-[11.5px] text-subtle">Applications are accepted only within the revaluation window notified for the exam and are subject to the regulation-defined eligibility threshold.</p>

        {mutation.isError && <p className="text-[12px] text-danger-fg">{(mutation.error as Error).message}</p>}

        <div className="flex gap-3 border-t border-divider pt-5">
          <Button
            variant="primarySmall"
            className="flex-[2] py-3"
            disabled={!studentId || !selectedMark || fee == null || !paymentMode || mutation.isPending}
            onClick={handleSave}
          >
            {mutation.isPending ? "Saving…" : "Submit application"}
          </Button>
          <Button variant="secondary" className="w-auto flex-1" onClick={handleClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
