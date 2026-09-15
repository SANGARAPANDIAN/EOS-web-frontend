"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, StatCard, SearchBar, Select, Button, Modal, Pagination, DEFAULT_PAGE_SIZE } from "@/components/ui";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils/cn";
import { CoePageHeader } from "@/modules/coe/PageHeader";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { downloadCsv } from "@/lib/utils/csv";
import { useExams } from "@/modules/coe/api/exams";
import { useDepartments } from "@/modules/shared/api/departments";
import { useAllScriptBundles } from "@/modules/coe/api/scriptBundles";
import {
  useEligibility,
  useEligibilityStats,
  useCreateCondonation,
  useReviewCondonation,
  type Eligibility,
  type EligibilityRow,
} from "@/modules/coe/api/attendanceEligibility";

type TabKey = "all" | "eligible" | "detained" | "condonation";
const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All students" },
  { key: "eligible", label: "Eligible" },
  { key: "detained", label: "Detained" },
  { key: "condonation", label: "Condonation requests" },
];

type RangeKey = "all" | "ge90" | "75to89" | "65to74" | "below65";
const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "all", label: "All ranges" },
  { key: "ge90", label: "90–100%" },
  { key: "75to89", label: "75–89%" },
  { key: "65to74", label: "65–74%" },
  { key: "below65", label: "Below 65%" },
];

function inRange(pct: number, range: RangeKey): boolean {
  switch (range) {
    case "ge90":
      return pct >= 90;
    case "75to89":
      return pct >= 75 && pct < 90;
    case "65to74":
      return pct >= 65 && pct < 75;
    case "below65":
      return pct < 65;
    default:
      return true;
  }
}

const YEAR_ROMAN = ["I", "II", "III", "IV", "V"];
function yearLabel(semester: number | null): string | null {
  if (!semester) return null;
  const year = Math.ceil(semester / 2);
  return YEAR_ROMAN[year - 1] ? `${YEAR_ROMAN[year - 1]} Year` : `Sem ${semester}`;
}

type PillTone = "blue" | "neutral";
const PILL_TONE_CLASS: Record<PillTone, string> = {
  blue: "bg-accent-50 text-primary border-border-accent",
  neutral: "bg-divider text-muted border-neutral-pill-border",
};
function Pill({ tone, children }: { tone: PillTone; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center whitespace-nowrap rounded-pill border px-[9px] py-1 text-[10.5px] font-extrabold tracking-[.06em]", PILL_TONE_CLASS[tone])}>
      {children}
    </span>
  );
}

const ELIGIBILITY_TONE: Record<Eligibility, PillTone> = { eligible: "blue", pending: "blue", detained: "blue" };
const ELIGIBILITY_LABEL: Record<Eligibility, string> = { eligible: "Eligible", pending: "Pending", detained: "Detained" };

export default function CoeAttendanceEligibilityPage() {
  const exams = useExams();
  const departments = useDepartments();

  // Attendance records live on real students, not on any exam directly —
  // defaulting to the highest-id exam often lands on a batch nobody has
  // attendance data for yet. Default instead to whichever exam's batch has
  // the most real script-bundle activity, since that's the batch actually
  // being worked with. No exam picker in this design, so this auto-pick is
  // the only resolution — same logic the previous version of this page used.
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

  const stats = useEligibilityStats(effectiveExamId);
  // Unfiltered fetch — every filter (tab, department, range, status, search)
  // is applied client-side below, same pattern as the Invigilation page.
  const rows = useEligibility(effectiveExamId, {});
  const allRows = rows.data ?? [];

  const [tab, setTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [range, setRange] = useState<RangeKey>("all");
  const [status, setStatus] = useState<"all" | Eligibility>("all");
  const [condonationRow, setCondonationRow] = useState<EligibilityRow | "new" | null>(null);
  const [page, setPage] = useState(1);

  function changeFilter<T>(setter: (v: T) => void, value: T) {
    setter(value);
    setPage(1);
  }

  const tabCounts = {
    all: allRows.length,
    eligible: allRows.filter((r) => r.eligibility === "eligible").length,
    detained: allRows.filter((r) => r.eligibility === "detained").length,
    condonation: allRows.filter((r) => r.condonation_status === "requested").length,
  };

  const filtered = allRows.filter((r) => {
    if (tab === "eligible" && r.eligibility !== "eligible") return false;
    if (tab === "detained" && r.eligibility !== "detained") return false;
    if (tab === "condonation" && r.condonation_status !== "requested") return false;
    if (departmentId != null && r.department?.id !== departmentId) return false;
    if (range !== "all" && !inRange(r.attendance_pct, range)) return false;
    if (status !== "all" && r.eligibility !== status) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const hay = [r.name, r.roll_no, r.register_no, r.student_id_no].filter(Boolean).join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / DEFAULT_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * DEFAULT_PAGE_SIZE, safePage * DEFAULT_PAGE_SIZE);

  function handleExport() {
    downloadCsv(
      "attendance-eligibility",
      [
        { header: "Student", value: (r: EligibilityRow) => r.name ?? r.register_no ?? r.student_id_no },
        { header: "Roll number", value: (r: EligibilityRow) => r.roll_no ?? r.register_no ?? "" },
        { header: "Department", value: (r: EligibilityRow) => r.department?.code ?? "" },
        { header: "Attendance %", value: (r: EligibilityRow) => r.attendance_pct },
        { header: "Shortfall courses", value: (r: EligibilityRow) => r.shortfall_courses },
        { header: "Condonation", value: (r: EligibilityRow) => r.condonation_status ?? "" },
        { header: "Eligibility", value: (r: EligibilityRow) => r.eligibility },
      ],
      filtered,
    );
  }

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <CoePageHeader
        title="Attendance & Eligibility"
        subtitle="Attendance percentage, eligibility status, detained students and condonation requests."
        actions={
          <>
            <Button variant="secondary" className="w-auto inline-flex items-center gap-1.5" onClick={handleExport}>
              <Icon name="download" size={16} />
              Export
            </Button>
            <Button variant="primarySmall" className="inline-flex items-center gap-1.5 px-5 py-3" onClick={() => setCondonationRow("new")}>
              <Icon name="add" size={16} />
              New condonation
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Eligible students"
          value={stats.data?.eligible_count ?? 0}
          icon="verified"
          sub={stats.data?.total ? `${Math.round((stats.data.eligible_count / stats.data.total) * 1000) / 10}% of registered` : undefined}
          loading={stats.isLoading}
        />
        <StatCard
          label={`Below ${stats.data?.threshold_pct ?? 75}% attendance`}
          value={stats.data?.below_threshold_count ?? 0}
          icon="trending_down"
          sub={stats.data?.total ? `${Math.round((stats.data.below_threshold_count / stats.data.total) * 1000) / 10}% of registered` : undefined}
          loading={stats.isLoading}
        />
        <StatCard
          label="Detained"
          value={stats.data?.detained_count ?? 0}
          icon="block"
          sub={stats.data?.total ? `${Math.round((stats.data.detained_count / stats.data.total) * 1000) / 10}% of strength` : undefined}
          loading={stats.isLoading}
        />
        <StatCard label="Condonation pending" value={stats.data?.condonation_pending_count ?? 0} icon="hourglass_empty" sub="awaiting review" loading={stats.isLoading} />
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
          <SearchBar placeholder="Search by roll number or name…" value={search} onChange={(e) => changeFilter(setSearch, e.target.value)} className="max-w-[300px]" />
          <Select value={departmentId ?? ""} onChange={(e) => changeFilter(setDepartmentId, e.target.value ? Number(e.target.value) : null)} className="w-auto min-w-[150px]">
            <option value="">All departments</option>
            {(departments.data ?? []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.code}
              </option>
            ))}
          </Select>
          <Select value={range} onChange={(e) => changeFilter(setRange, e.target.value as RangeKey)} className="w-auto min-w-[130px]">
            {RANGE_OPTIONS.map((r) => (
              <option key={r.key} value={r.key}>
                {r.label}
              </option>
            ))}
          </Select>
          <Select value={status} onChange={(e) => changeFilter(setStatus, e.target.value as typeof status)} className="w-auto min-w-[130px]">
            <option value="all">All status</option>
            <option value="eligible">Eligible</option>
            <option value="pending">Pending</option>
            <option value="detained">Detained</option>
          </Select>
          <span className="ml-auto text-[13px] text-muted">{filtered.length} records</span>
        </div>

        {rows.isLoading ? (
          <div className="p-5">
            <SkeletonTable rows={6} />
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-5 py-6 text-[13px] text-subtle">No students match the current filters.</p>
        ) : (
          <>
          <div className="flex flex-col">
            <div className="flex items-center gap-4 border-b border-divider bg-surface-subtle px-5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">
              <div className="flex-1">Student</div>
              <div className="w-[150px]">Department</div>
              <div className="w-[100px]">Attendance</div>
              <div className="w-[140px]">Shortfall courses</div>
              <div className="w-[120px]">Condonation</div>
              <div className="w-[100px]">Eligibility</div>
              <div className="w-[130px] text-right"> </div>
            </div>
            {pageRows.map((r) => (
              <EligibilityRowView key={r.id} row={r} onAppeal={() => setCondonationRow(r)} />
            ))}
          </div>
          <Pagination page={safePage} pageSize={DEFAULT_PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
          </>
        )}
      </Card>

      <CondonationModal
        open={condonationRow != null}
        initialRow={condonationRow === "new" ? null : condonationRow}
        allRows={allRows}
        examId={effectiveExamId}
        onClose={() => setCondonationRow(null)}
      />
    </div>
  );
}

function EligibilityRowView({ row: r, onAppeal }: { row: EligibilityRow; onAppeal: () => void }) {
  const reviewCondonation = useReviewCondonation();

  return (
    <div className="flex items-center gap-4 border-b border-divider px-5 py-4 last:border-0">
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13.5px] font-bold text-ink">{r.name ?? r.register_no ?? r.student_id_no}</div>
        <div className="truncate text-[11.5px] text-muted">{r.roll_no ?? r.register_no ?? r.student_id_no}</div>
      </div>
      <div className="w-[150px] min-w-0 shrink-0 truncate text-[12.5px] text-ink">
        {[r.department?.code, yearLabel(r.semester)].filter(Boolean).join(" · ") || "—"}
      </div>
      <div className="w-[100px] shrink-0 text-[13px] font-bold text-ink">{r.attendance_pct}%</div>
      <div className="w-[140px] shrink-0 text-[12.5px] text-ink">{r.shortfall_courses}</div>
      <div className="w-[120px] min-w-0 shrink-0">
        {r.condonation_status === "approved" ? (
          <Pill tone="blue">Approved</Pill>
        ) : r.condonation_status === "rejected" ? (
          <Pill tone="blue">Rejected</Pill>
        ) : r.condonation_status === "requested" ? (
          <Pill tone="blue">Requested</Pill>
        ) : (
          <Pill tone="neutral">—</Pill>
        )}
      </div>
      <div className="w-[100px] min-w-0 shrink-0">
        <Pill tone={ELIGIBILITY_TONE[r.eligibility]}>{ELIGIBILITY_LABEL[r.eligibility]}</Pill>
      </div>
      <div className="flex w-[130px] shrink-0 justify-end gap-3">
        {r.condonation_status === "requested" && r.condonation_id ? (
          <>
            <button
              type="button"
              className="text-[12.5px] font-bold text-primary hover:underline disabled:opacity-40"
              disabled={reviewCondonation.isPending}
              onClick={() => reviewCondonation.mutate({ id: r.condonation_id!, status: "approved" })}
            >
              Approve
            </button>
            <button
              type="button"
              className="text-[12.5px] font-bold text-primary hover:underline disabled:opacity-40"
              disabled={reviewCondonation.isPending}
              onClick={() => reviewCondonation.mutate({ id: r.condonation_id!, status: "rejected" })}
            >
              Reject
            </button>
          </>
        ) : (
          <>
            <Link href={`/coe/student-exam-record/${r.id}`} className="text-[12.5px] font-bold text-primary hover:underline">
              View
            </Link>
            {r.eligibility === "detained" && !r.condonation_status && (
              <button type="button" className="text-[12.5px] font-bold text-primary hover:underline" onClick={onAppeal}>
                Appeal
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const GROUND_OPTIONS = ["Medical", "Family emergency", "Official duty / OD", "Other"];
const DOCUMENT_OPTIONS = ["Medical certificate", "Official letter", "Parent letter", "Other"];

function CondonationModal({
  open,
  initialRow,
  allRows,
  examId,
  onClose,
}: {
  open: boolean;
  initialRow: EligibilityRow | null;
  allRows: EligibilityRow[];
  examId: number | null;
  onClose: () => void;
}) {
  const create = useCreateCondonation();
  const [rollNumber, setRollNumber] = useState(initialRow?.roll_no ?? initialRow?.register_no ?? "");
  const [ground, setGround] = useState(GROUND_OPTIONS[0]);
  const [supportingDocument, setSupportingDocument] = useState(DOCUMENT_OPTIONS[0]);
  const [remarks, setRemarks] = useState("");

  const matchedRow = useMemo(() => {
    const q = rollNumber.trim().toLowerCase();
    if (!q) return null;
    return allRows.find((r) => (r.roll_no ?? "").toLowerCase() === q || (r.register_no ?? "").toLowerCase() === q) ?? null;
  }, [rollNumber, allRows]);

  function reset() {
    setRollNumber(initialRow?.roll_no ?? initialRow?.register_no ?? "");
    setGround(GROUND_OPTIONS[0]);
    setSupportingDocument(DOCUMENT_OPTIONS[0]);
    setRemarks("");
    create.reset();
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleSave() {
    if (!matchedRow || !examId) return;
    const reason = [`Ground: ${ground}`, `Supporting document: ${supportingDocument}`, remarks.trim() ? `Remarks: ${remarks.trim()}` : null].filter(Boolean).join(" · ");
    create.mutate({ student_id: matchedRow.id, exam_id: examId, reason }, { onSuccess: handleClose });
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Raise condonation request"
      subtitle="Condonation may be granted between 65% and 74% attendance with a medical or official record."
    >
      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Roll number *</label>
          <input
            type="text"
            value={rollNumber}
            onChange={(e) => setRollNumber(e.target.value)}
            placeholder="e.g. 22IT073"
            className="w-full rounded-input border border-border-default bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-subtle focus:border-border-accent focus:outline-none"
          />
          {rollNumber.trim() && !matchedRow && <p className="mt-1.5 text-[12px] text-danger-fg">No student found with this roll number.</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Attendance recorded</label>
          <div className="w-full rounded-input border border-border-default bg-surface-subtle px-3 py-2.5 text-sm text-ink">
            {matchedRow ? `${matchedRow.attendance_pct}%` : "—"}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Ground</label>
          <select
            value={ground}
            onChange={(e) => setGround(e.target.value)}
            className="w-full rounded-input border border-border-default bg-surface px-3 py-2.5 text-sm text-ink focus:border-border-accent focus:outline-none"
          >
            {GROUND_OPTIONS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Supporting document</label>
          <select
            value={supportingDocument}
            onChange={(e) => setSupportingDocument(e.target.value)}
            className="w-full rounded-input border border-border-default bg-surface px-3 py-2.5 text-sm text-ink focus:border-border-accent focus:outline-none"
          >
            {DOCUMENT_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Remarks</label>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Seen by the HoD and the COE"
            rows={3}
            className="w-full resize-y rounded-input border border-border-default bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-subtle focus:border-border-accent focus:outline-none"
          />
        </div>

        {create.isError && <p className="text-[12px] text-danger-fg">{(create.error as Error).message}</p>}

        <div className="flex gap-3 border-t border-divider pt-5">
          <Button variant="primarySmall" className="flex-[2] py-3" disabled={!matchedRow || !examId || create.isPending} onClick={handleSave}>
            {create.isPending ? "Saving…" : "Save"}
          </Button>
          <Button variant="secondary" className="w-auto flex-1" onClick={handleClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
