"use client";

import { useState } from "react";
import { Card, StatCard, SearchBar, Select, Button, Badge, Modal, Pagination, DEFAULT_PAGE_SIZE, type BadgeTone } from "@/components/ui";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils/cn";
import { CoePageHeader } from "@/modules/coe/PageHeader";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { downloadCsv } from "@/lib/utils/csv";
import { formatDate } from "@/lib/utils/format";
import { useDepartments } from "@/modules/shared/api/departments";
import {
  useArrearOverview,
  useArrearStudentHistory,
  useScheduleSupplementary,
  type ArrearStatus,
  type ArrearStudentRow,
} from "@/modules/coe/api/arrears";

type Bucket = "all" | "registered" | "standing" | "cleared";

const TABS: { key: Bucket; label: string }[] = [
  { key: "all", label: "All arrear students" },
  { key: "registered", label: "Registered" },
  { key: "standing", label: "Standing arrears" },
  { key: "cleared", label: "Cleared this cycle" },
];

const STATUS_LABEL: Record<ArrearStatus, string> = { registered: "Registered", not_eligible: "Not eligible", cleared: "Cleared", pending: "Pending" };
const STATUS_TONE: Record<ArrearStatus, BadgeTone> = { registered: "neutral", not_eligible: "danger", cleared: "accentDark", pending: "accent" };
const YEAR_ROMAN: Record<number, string> = { 1: "I", 2: "II", 3: "III", 4: "IV", 5: "V", 6: "VI" };

function bucketOf(row: ArrearStudentRow): Bucket[] {
  const buckets: Bucket[] = ["all"];
  if (row.status === "registered") buckets.push("registered");
  if (row.standing_arrears_count > 0) buckets.push("standing");
  if (row.status === "cleared") buckets.push("cleared");
  return buckets;
}

export default function CoeSupplementaryArrearPage() {
  const departments = useDepartments();
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState<"all" | number>("all");
  const [year, setYear] = useState<"all" | number>("all");
  const [status, setStatus] = useState<"all" | ArrearStatus>("all");
  const [tab, setTab] = useState<Bucket>("all");
  const [page, setPage] = useState(1);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [historyStudentId, setHistoryStudentId] = useState<number | null>(null);

  function changeFilter<T>(setter: (v: T) => void, value: T) {
    setter(value);
    setPage(1);
  }

  const overview = useArrearOverview({
    search: search.trim() || undefined,
    department_id: departmentId === "all" ? undefined : departmentId,
    year: year === "all" ? undefined : year,
    status: status === "all" ? undefined : status,
  });
  const stats = overview.data?.stats;
  const allRows = overview.data?.students ?? [];

  const tabCounts = {
    all: allRows.length,
    registered: allRows.filter((r) => r.status === "registered").length,
    standing: allRows.filter((r) => r.standing_arrears_count > 0).length,
    cleared: allRows.filter((r) => r.status === "cleared").length,
  };
  const filtered = allRows.filter((r) => bucketOf(r).includes(tab));
  const totalPages = Math.max(1, Math.ceil(filtered.length / DEFAULT_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * DEFAULT_PAGE_SIZE, safePage * DEFAULT_PAGE_SIZE);

  function handleExport() {
    downloadCsv(
      "supplementary-arrear",
      [
        { header: "Student", value: (r: ArrearStudentRow) => r.name ?? r.register_no },
        { header: "Register No", value: (r: ArrearStudentRow) => r.register_no },
        { header: "Department", value: (r: ArrearStudentRow) => r.department?.code ?? "" },
        { header: "Year", value: (r: ArrearStudentRow) => (r.year ? YEAR_ROMAN[r.year] ?? String(r.year) : "") },
        { header: "Standing arrears", value: (r: ArrearStudentRow) => r.standing_arrears_count },
        { header: "Oldest arrear", value: (r: ArrearStudentRow) => (r.oldest_arrear ? `${r.oldest_arrear.subject_code} · ${formatDate(r.oldest_arrear.standing_since)}` : "") },
        { header: "Attempts", value: (r: ArrearStudentRow) => r.oldest_arrear?.attempts ?? "" },
        { header: "Status", value: (r: ArrearStudentRow) => STATUS_LABEL[r.status] },
      ],
      filtered,
    );
  }

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <CoePageHeader
        title="Supplementary & Arrear"
        subtitle="Arrear registration, supplementary scheduling, results and student arrear history."
        actions={
          <>
            <Button variant="secondary" className="w-auto inline-flex items-center gap-1.5" onClick={handleExport}>
              <Icon name="download" size={16} />
              Export
            </Button>
            <Button variant="primarySmall" className="inline-flex items-center gap-1.5 px-5 py-3" onClick={() => setScheduleOpen(true)}>
              <Icon name="add" size={16} />
              Schedule supplementary
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Arrear students"
          value={stats?.arrear_students ?? 0}
          icon="event_repeat"
          sub={stats?.arrear_students_pct_of_strength != null ? `${stats.arrear_students_pct_of_strength}% of strength` : undefined}
          loading={overview.isLoading}
        />
        <StatCard
          label="Standing arrears"
          value={stats?.standing_arrears_total ?? 0}
          icon="layers"
          sub={stats?.standing_arrears_avg_per_student != null ? `${stats.standing_arrears_avg_per_student} avg per student` : undefined}
          loading={overview.isLoading}
        />
        <StatCard
          label="Registered for arrear"
          value={stats?.registered_for_arrear ?? 0}
          icon="how_to_reg"
          sub={stats?.registered_pct_of_eligible != null ? `${stats.registered_pct_of_eligible}% of eligible` : undefined}
          loading={overview.isLoading}
        />
        <StatCard
          label="Cleared last cycle"
          value={stats?.cleared_last_cycle ?? 0}
          icon="task_alt"
          sub={stats ? `${stats.cleared_last_cycle_delta >= 0 ? "+" : ""}${stats.cleared_last_cycle_delta} vs previous` : undefined}
          loading={overview.isLoading}
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
          <SearchBar placeholder="Search roll number or course…" value={search} onChange={(e) => changeFilter(setSearch, e.target.value)} className="max-w-[280px]" />
          <Select value={departmentId} onChange={(e) => changeFilter(setDepartmentId, e.target.value === "all" ? "all" : Number(e.target.value))} className="w-auto min-w-[150px]">
            <option value="all">All departments</option>
            {(departments.data ?? []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.code}
              </option>
            ))}
          </Select>
          <Select value={year} onChange={(e) => changeFilter(setYear, e.target.value === "all" ? "all" : Number(e.target.value))} className="w-auto min-w-[110px]">
            <option value="all">All years</option>
            {[1, 2, 3, 4].map((y) => (
              <option key={y} value={y}>
                {YEAR_ROMAN[y]} Year
              </option>
            ))}
          </Select>
          <Select value={status} onChange={(e) => changeFilter(setStatus, e.target.value as typeof status)} className="w-auto min-w-[140px]">
            <option value="all">All status</option>
            <option value="registered">Registered</option>
            <option value="not_eligible">Not eligible</option>
            <option value="cleared">Cleared</option>
            <option value="pending">Pending</option>
          </Select>
          <span className="ml-auto text-[13px] text-muted">{filtered.length} records</span>
        </div>

        {overview.isLoading ? (
          <div className="p-5">
            <SkeletonTable rows={7} />
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-5 py-6 text-[13px] text-subtle">No arrear students match the current filters.</p>
        ) : (
          <>
          <div className="flex flex-col">
            <div className="flex items-center gap-4 border-b border-divider bg-surface-subtle px-5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">
              <div className="flex-1">Student</div>
              <div className="w-[150px]">Department</div>
              <div className="w-[110px] text-right">Standing arrears</div>
              <div className="w-[160px]">Oldest arrear</div>
              <div className="w-[90px] text-right">Attempts</div>
              <div className="w-[110px]">Status</div>
              <div className="w-[80px] text-right"> </div>
            </div>
            {pageRows.map((r) => (
              <div key={r.id} className="flex items-center gap-4 border-b border-divider px-5 py-4 last:border-0">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-bold text-ink">{r.name ?? r.register_no}</div>
                  <div className="truncate text-[11.5px] text-muted">{r.register_no}</div>
                </div>
                <div className="w-[150px] min-w-0 shrink-0 truncate text-[12.5px] text-ink">
                  {r.department?.code ?? "—"}
                  {r.year ? ` · ${YEAR_ROMAN[r.year] ?? r.year} Year` : ""}
                </div>
                <div className="w-[110px] shrink-0 text-right text-[13px] font-bold text-ink">{r.standing_arrears_count}</div>
                <div className="w-[160px] min-w-0 shrink-0">
                  {r.oldest_arrear ? (
                    <>
                      <div className="truncate text-[12.5px] font-semibold text-ink">{r.oldest_arrear.subject_code}</div>
                      <div className="text-[11px] text-muted">{formatDate(r.oldest_arrear.standing_since)}</div>
                    </>
                  ) : (
                    <span className="text-[12.5px] text-subtle">—</span>
                  )}
                </div>
                <div className="w-[90px] shrink-0 text-right text-[12.5px] text-ink">{r.oldest_arrear?.attempts ?? "—"}</div>
                <div className="w-[110px] min-w-0 shrink-0">
                  <Badge tone={STATUS_TONE[r.status]} className="max-w-full truncate">
                    {STATUS_LABEL[r.status]}
                  </Badge>
                </div>
                <div className="flex w-[80px] shrink-0 justify-end">
                  <button type="button" className="text-[12.5px] font-bold text-primary hover:underline" onClick={() => setHistoryStudentId(r.id)}>
                    History
                  </button>
                </div>
              </div>
            ))}
          </div>
          <Pagination page={safePage} pageSize={DEFAULT_PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
          </>
        )}
      </Card>

      <ScheduleSupplementaryModal open={scheduleOpen} onClose={() => setScheduleOpen(false)} />
      <HistoryModal studentId={historyStudentId} onClose={() => setHistoryStudentId(null)} />
    </div>
  );
}

function HistoryModal({ studentId, onClose }: { studentId: number | null; onClose: () => void }) {
  const history = useArrearStudentHistory(studentId);
  const data = history.data;

  return (
    <Modal open={studentId != null} onClose={onClose} title="Arrear history" subtitle={data ? `${data.student.name ?? data.student.register_no} · ${data.student.register_no}` : undefined}>
      {history.isLoading ? (
        <p className="text-[13px] text-subtle">Loading…</p>
      ) : data ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4 border-b border-divider pb-2.5 text-[13px]">
            <span className="font-bold text-muted">Department</span>
            <span className="text-ink">
              {data.student.department?.code ?? "—"} {data.student.year ? `· ${YEAR_ROMAN[data.student.year] ?? data.student.year} Year` : ""}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 border-b border-divider pb-2.5 text-[13px]">
            <span className="font-bold text-muted">Arrear registration</span>
            <span className="text-ink">{data.registered ? "Registered" : "Not registered"}</span>
          </div>
          {data.standing_arrears.length === 0 ? (
            <p className="py-2 text-[13px] text-subtle">No standing arrears — every subject has been cleared.</p>
          ) : (
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wide text-muted">Standing arrears ({data.standing_arrears.length})</span>
              {data.standing_arrears.map((a) => (
                <div key={a.subject_code} className="flex items-center justify-between gap-4 rounded-input border border-border-default px-3 py-2.5">
                  <div>
                    <div className="text-[12.5px] font-bold text-ink">{a.subject_code}</div>
                    <div className="text-[11.5px] text-muted">{a.subject_name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[12px] text-ink">Since {formatDate(a.standing_since)}</div>
                    <div className="text-[11px] text-muted">{a.attempts} attempt{a.attempts === 1 ? "" : "s"}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Button variant="secondary" className="mt-2 w-auto self-end" onClick={onClose}>
            Close
          </Button>
        </div>
      ) : null}
    </Modal>
  );
}

function ScheduleSupplementaryModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const schedule = useScheduleSupplementary();
  const [title, setTitle] = useState("");
  const [startsOn, setStartsOn] = useState("");
  const [endsOn, setEndsOn] = useState("");
  const [fee, setFee] = useState("");

  function reset() {
    setTitle("");
    setStartsOn("");
    setEndsOn("");
    setFee("");
    schedule.reset();
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleSave() {
    if (!title.trim() || !startsOn || !endsOn || !fee.trim()) return;
    schedule.mutate({ title: title.trim(), starts_on: startsOn, ends_on: endsOn, fee_per_course: Number(fee) }, { onSuccess: handleClose });
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Schedule supplementary exam"
      subtitle="Creates a supplementary sitting for every currently-standing arrear course and opens registration."
    >
      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Supplementary title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Supplementary Feb 2027"
            className="w-full rounded-input border border-border-default bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-subtle focus:border-border-accent focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Courses</label>
          <select
            disabled
            value="all"
            className="w-full rounded-input border border-border-default bg-surface-subtle px-3 py-2.5 text-sm text-ink disabled:opacity-70"
          >
            <option value="all">All standing arrear courses</option>
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Exam window *</label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startsOn}
              onChange={(e) => setStartsOn(e.target.value)}
              className="w-full rounded-input border border-border-default bg-surface px-3 py-2.5 text-sm text-ink focus:border-border-accent focus:outline-none"
            />
            <span className="text-muted">–</span>
            <input
              type="date"
              value={endsOn}
              onChange={(e) => setEndsOn(e.target.value)}
              className="w-full rounded-input border border-border-default bg-surface px-3 py-2.5 text-sm text-ink focus:border-border-accent focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Fee per course (₹) *</label>
          <input
            type="number"
            min={0}
            value={fee}
            onChange={(e) => setFee(e.target.value)}
            placeholder="600"
            className="w-full rounded-input border border-border-default bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-subtle focus:border-border-accent focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Eligibility rule</label>
          <select
            disabled
            value="all"
            className="w-full rounded-input border border-border-default bg-surface-subtle px-3 py-2.5 text-sm text-ink disabled:opacity-70"
          >
            <option value="all">All arrear students</option>
          </select>
        </div>

        {schedule.isError && <p className="text-[12px] text-danger-fg">{(schedule.error as Error).message}</p>}

        <div className="flex gap-3 border-t border-divider pt-5">
          <Button
            variant="primarySmall"
            className="flex-[2] py-3"
            disabled={!title.trim() || !startsOn || !endsOn || !fee.trim() || schedule.isPending}
            onClick={handleSave}
          >
            {schedule.isPending ? "Saving…" : "Save"}
          </Button>
          <Button variant="secondary" className="w-auto flex-1" onClick={handleClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
