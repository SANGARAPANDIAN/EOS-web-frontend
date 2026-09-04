"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, StatCard, SearchBar, Select, Button, Badge, Modal, Pagination, DEFAULT_PAGE_SIZE, type BadgeTone } from "@/components/ui";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils/cn";
import { CoePageHeader } from "@/modules/coe/PageHeader";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { downloadCsv } from "@/lib/utils/csv";
import { useDepartments } from "@/modules/shared/api/departments";
import { useLookupStudentByRegisterNo, isNotFound } from "@/modules/coe/api/malpractice";
import {
  useConvocationRegistrations,
  useConvocationStats,
  useVerifyConvocation,
  useRegisterForConvocation,
  useAwardDegree,
  useNotifyConvocation,
  type ConvocationRegistration,
  type ConvocationStatus,
} from "@/modules/coe/api/convocation";

type Bucket = "eligible" | "shortfall" | "degree_awarded";
type TabKey = "all" | Bucket;

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All candidates" },
  { key: "eligible", label: "Eligible" },
  { key: "shortfall", label: "Shortfall" },
  { key: "degree_awarded", label: "Degree awarded" },
];

const STATUS_LABEL: Record<ConvocationStatus, string> = {
  eligible: "Eligible",
  shortfall: "Shortfall",
  registered: "Registered",
  degree_awarded: "Degree awarded",
};
const STATUS_TONE: Record<ConvocationStatus, BadgeTone> = {
  eligible: "accentDark",
  shortfall: "danger",
  registered: "neutral",
  degree_awarded: "accentDark",
};

/** "Eligible" bucket covers both not-yet-registered and already-registered candidates — registered is just eligible-plus-one-step, not a separate outcome. */
function bucketOf(status: ConvocationStatus): Bucket {
  if (status === "shortfall") return "shortfall";
  if (status === "degree_awarded") return "degree_awarded";
  return "eligible";
}

function studentName(r: ConvocationRegistration): string {
  const s = r.students;
  return s.soa_applications ? [s.soa_applications.first_name, s.soa_applications.last_name].filter(Boolean).join(" ") : (s.register_no ?? s.student_id_no);
}

export default function CoeConvocationDegreePage() {
  const departments = useDepartments();
  const [tab, setTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState<"all" | number>("all");
  const [semester, setSemester] = useState<"all" | number>("all");
  const [status, setStatus] = useState<"all" | ConvocationStatus>("all");
  const [page, setPage] = useState(1);
  const [verifyOpen, setVerifyOpen] = useState(false);

  const stats = useConvocationStats();
  const allRows = useConvocationRegistrations({ search: search.trim() || undefined, status: status === "all" ? undefined : status });

  function changeFilter<T>(setter: (v: T) => void, value: T) {
    setter(value);
    setPage(1);
  }

  const data = allRows.data ?? [];
  const tabCounts = {
    all: data.length,
    eligible: data.filter((r) => bucketOf(r.status) === "eligible").length,
    shortfall: data.filter((r) => bucketOf(r.status) === "shortfall").length,
    degree_awarded: data.filter((r) => bucketOf(r.status) === "degree_awarded").length,
  };

  const filtered = data.filter((r) => {
    if (tab !== "all" && bucketOf(r.status) !== tab) return false;
    if (departmentId !== "all" && r.students.classes?.departments.id !== departmentId) return false;
    if (semester !== "all" && r.students.classes?.current_semester !== semester) return false;
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / DEFAULT_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * DEFAULT_PAGE_SIZE, safePage * DEFAULT_PAGE_SIZE);

  function handleExport() {
    downloadCsv(
      "convocation-registrations",
      [
        { header: "Student", value: (r: ConvocationRegistration) => studentName(r) },
        { header: "Register no", value: (r: ConvocationRegistration) => r.students.register_no ?? r.students.student_id_no },
        { header: "Programme", value: (r: ConvocationRegistration) => r.students.classes?.courses?.name ?? "" },
        { header: "CGPA", value: (r: ConvocationRegistration) => r.cgpa ?? "" },
        { header: "Arrears", value: (r: ConvocationRegistration) => r.arrears_count },
        { header: "Classification", value: (r: ConvocationRegistration) => r.classification ?? "" },
        { header: "Status", value: (r: ConvocationRegistration) => STATUS_LABEL[r.status] },
        { header: "Registered at", value: (r: ConvocationRegistration) => r.registered_at?.slice(0, 10) ?? "" },
      ],
      filtered,
    );
  }

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <CoePageHeader
        title="Convocation & Degree"
        subtitle="Degree eligibility verification, classification, convocation registration and degree certificate dispatch."
        actions={
          <>
            <Button variant="secondary" className="w-auto inline-flex items-center gap-1.5" onClick={handleExport}>
              <Icon name="download" size={16} />
              Export
            </Button>
            <Button variant="primarySmall" className="inline-flex items-center gap-1.5 px-5 py-3" onClick={() => setVerifyOpen(true)}>
              <Icon name="add" size={16} />
              Verify a candidate
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Provisionally eligible"
          value={stats.data?.provisionally_eligible ?? 0}
          icon="verified"
          sub={stats.data ? `of ${stats.data.final_year_strength} final year strength` : undefined}
          loading={stats.isLoading}
        />
        <StatCard
          label="With shortfall"
          value={stats.data?.with_shortfall ?? 0}
          icon="trending_down"
          sub={stats.data ? `${stats.data.shortfall_arrears} arrears · ${stats.data.shortfall_dues_or_records} dues or records` : undefined}
          loading={stats.isLoading}
        />
        <StatCard
          label="Convocation registered"
          value={stats.data?.convocation_registered ?? 0}
          icon="how_to_reg"
          sub={stats.data?.registered_pct_of_eligible != null ? `${stats.data.registered_pct_of_eligible}% of eligible` : undefined}
          loading={stats.isLoading}
        />
        <StatCard label="Gold medal candidates" value={stats.data?.gold_medal_candidates ?? 0} icon="workspace_premium" sub="CGPA 9.5 and above" loading={stats.isLoading} />
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
          <SearchBar placeholder="Search roll number or name…" value={search} onChange={(e) => changeFilter(setSearch, e.target.value)} className="max-w-[260px]" />
          <Select value={departmentId} onChange={(e) => changeFilter(setDepartmentId, e.target.value === "all" ? "all" : Number(e.target.value))} className="w-auto min-w-[150px]">
            <option value="all">All programmes</option>
            {(departments.data ?? []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.code}
              </option>
            ))}
          </Select>
          <Select value={semester} onChange={(e) => changeFilter(setSemester, e.target.value === "all" ? "all" : Number(e.target.value))} className="w-auto min-w-[130px]">
            <option value="all">All classes</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
              <option key={s} value={s}>
                Semester {s}
              </option>
            ))}
          </Select>
          <Select value={status} onChange={(e) => changeFilter(setStatus, e.target.value as typeof status)} className="w-auto min-w-[140px]">
            <option value="all">All status</option>
            <option value="eligible">Eligible</option>
            <option value="shortfall">Shortfall</option>
            <option value="registered">Registered</option>
            <option value="degree_awarded">Degree awarded</option>
          </Select>
          <span className="ml-auto text-[13px] text-muted">{filtered.length} records</span>
        </div>

        {allRows.isLoading ? (
          <div className="p-5">
            <SkeletonTable rows={6} />
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-5 py-6 text-[13px] text-subtle">No candidates match the current filters.</p>
        ) : (
          <>
            <div className="flex flex-col">
              <div className="flex items-center gap-4 border-b border-divider bg-surface-subtle px-5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">
                <div className="flex-1">Candidate</div>
                <div className="w-[180px]">Programme</div>
                <div className="w-[70px] text-right">CGPA</div>
                <div className="w-[70px] text-right">Arrears</div>
                <div className="w-[190px]">Classification</div>
                <div className="w-[110px]">Status</div>
                <div className="w-[130px] text-right">Actions</div>
              </div>
              {pageRows.map((r) => (
                <CandidateRow key={r.id} row={r} />
              ))}
            </div>
            <Pagination page={safePage} pageSize={DEFAULT_PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
          </>
        )}
      </Card>

      <VerifyCandidateModal open={verifyOpen} onClose={() => setVerifyOpen(false)} />
    </div>
  );
}

function CandidateRow({ row: r }: { row: ConvocationRegistration }) {
  const register = useRegisterForConvocation();
  const awardDegree = useAwardDegree();
  const notify = useNotifyConvocation();

  return (
    <div className="flex items-center gap-4 border-b border-divider px-5 py-4 last:border-0">
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13.5px] font-bold text-ink">{studentName(r)}</div>
        <div className="truncate text-[11.5px] text-muted">{r.students.register_no ?? r.students.student_id_no}</div>
      </div>
      <div className="w-[180px] min-w-0 shrink-0 truncate text-[12.5px] text-ink">{r.students.classes?.courses?.name ?? "—"}</div>
      <div className="w-[70px] shrink-0 text-right text-[13px] font-bold text-ink">{r.cgpa != null ? r.cgpa.toFixed(2) : "—"}</div>
      <div className="w-[70px] shrink-0 text-right text-[12.5px] text-ink">{r.arrears_count}</div>
      <div className="w-[190px] min-w-0 shrink-0">
        <Badge tone="neutral" className="max-w-full truncate">
          {r.classification ?? "—"}
        </Badge>
      </div>
      <div className="w-[110px] min-w-0 shrink-0">
        <Badge tone={STATUS_TONE[r.status]} className="max-w-full truncate">
          {STATUS_LABEL[r.status]}
        </Badge>
      </div>
      <div className="flex w-[130px] shrink-0 items-center justify-end gap-3">
        <Link href={`/coe/student-exam-record/${r.student_id}`} className="text-[12.5px] font-bold text-primary hover:underline">
          Profile
        </Link>
        {r.status === "eligible" && (
          <button
            type="button"
            className="text-[12.5px] font-bold text-primary hover:underline disabled:opacity-50"
            disabled={register.isPending}
            onClick={() => register.mutate(r.id)}
          >
            {register.isPending ? "…" : "Register"}
          </button>
        )}
        {r.status === "registered" && (
          <button
            type="button"
            className="text-[12.5px] font-bold text-primary hover:underline disabled:opacity-50"
            disabled={awardDegree.isPending}
            onClick={() => awardDegree.mutate(r.id)}
          >
            {awardDegree.isPending ? "…" : "Print"}
          </button>
        )}
        {r.status === "shortfall" && (
          <button
            type="button"
            className="text-[12.5px] font-bold text-primary hover:underline disabled:opacity-50"
            disabled={notify.isPending || notify.isSuccess}
            onClick={() => notify.mutate(r.id)}
          >
            {notify.isSuccess ? "Notified" : notify.isPending ? "Sending…" : "Notify"}
          </button>
        )}
      </div>
    </div>
  );
}

function VerifyCandidateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const lookup = useLookupStudentByRegisterNo();
  const verify = useVerifyConvocation();

  const [rollNumber, setRollNumber] = useState("");
  const [lookedUpFor, setLookedUpFor] = useState("");
  const [convocationBatch, setConvocationBatch] = useState("");
  const [includeInMeritList, setIncludeInMeritList] = useState<"yes" | "no">("yes");
  const [remarks, setRemarks] = useState("");

  function reset() {
    setRollNumber("");
    setLookedUpFor("");
    setConvocationBatch("");
    setIncludeInMeritList("yes");
    setRemarks("");
    lookup.reset();
    verify.reset();
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleRollBlur() {
    const value = rollNumber.trim();
    if (!value || value === lookedUpFor) return;
    setLookedUpFor(value);
    lookup.mutate(value);
  }

  function handleSave() {
    if (!lookup.data) return;
    verify.mutate(
      {
        student_id: lookup.data.id,
        convocation_batch: convocationBatch.trim() || undefined,
        merit_list_eligible: includeInMeritList === "yes",
        remarks: remarks.trim() || undefined,
      },
      { onSuccess: handleClose },
    );
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Verify degree eligibility"
      subtitle="Checks credits earned against the regulation, standing arrears, disciplinary holds and outstanding dues across all semesters."
    >
      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Roll number *</label>
          <input
            type="text"
            value={rollNumber}
            onChange={(e) => setRollNumber(e.target.value)}
            onBlur={handleRollBlur}
            placeholder="e.g. 21CS001"
            className="w-full rounded-input border border-border-default bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-subtle focus:border-border-accent focus:outline-none"
          />
          {lookup.isPending ? (
            <p className="mt-1.5 text-[12px] text-muted">Looking up…</p>
          ) : lookup.data ? (
            <p className="mt-1.5 text-[12px] font-semibold text-primary">
              Found: {lookup.data.name ?? lookup.data.register_no} · {lookup.data.department_code ?? "—"}
            </p>
          ) : lookup.isError ? (
            <p className="mt-1.5 text-[12px] text-danger-fg">{isNotFound(lookup.error) ? "No student found with this roll number." : (lookup.error as Error).message}</p>
          ) : null}
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Regulation</label>
          <div className="rounded-input border border-border-default bg-surface-subtle px-3 py-2.5 text-sm text-ink">{lookup.data?.regulation_code ?? "—"}</div>
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Convocation</label>
          <input
            type="text"
            value={convocationBatch}
            onChange={(e) => setConvocationBatch(e.target.value)}
            placeholder="e.g. 14th Convocation · Mar 2027"
            className="w-full rounded-input border border-border-default bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-subtle focus:border-border-accent focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Include in merit list</label>
          <select
            value={includeInMeritList}
            onChange={(e) => setIncludeInMeritList(e.target.value as "yes" | "no")}
            className="w-full rounded-input border border-border-default bg-surface px-3 py-2.5 text-sm text-ink focus:border-border-accent focus:outline-none"
          >
            <option value="yes">Yes, if eligible</option>
            <option value="no">No</option>
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Remarks</label>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            rows={2}
            placeholder="Optional notes for this verification"
            className="w-full resize-y rounded-input border border-border-default bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-subtle focus:border-border-accent focus:outline-none"
          />
        </div>

        {verify.isError && <p className="text-[12px] text-danger-fg">{(verify.error as Error).message}</p>}

        <div className="flex gap-3 border-t border-divider pt-5">
          <Button variant="primarySmall" className="flex-[2] py-3" disabled={!lookup.data || verify.isPending} onClick={handleSave}>
            {verify.isPending ? "Verifying…" : "Save"}
          </Button>
          <Button variant="secondary" className="w-auto flex-1" onClick={handleClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
