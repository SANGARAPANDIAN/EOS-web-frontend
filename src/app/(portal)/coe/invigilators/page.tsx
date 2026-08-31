"use client";

import { useMemo, useState } from "react";
import { Card, StatCard, SearchBar, Select, Button, Badge, Modal, Pagination, DEFAULT_PAGE_SIZE } from "@/components/ui";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils/cn";
import { CoePageHeader } from "@/modules/coe/PageHeader";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { downloadCsv } from "@/lib/utils/csv";
import { useFacultyDirectory } from "@/modules/coe/api/faculty";
import {
  useInvigilationDuties,
  useInvigilationStats,
  useUnfilledSlots,
  useUpdateInvigilationDuty,
  useAcknowledgeInvigilationDuty,
  useRemindInvigilationDuty,
  useDeleteInvigilationDuty,
  useAutoAssignInvigilation,
  useCreateInvigilationDuty,
  useVenuesOverview,
  useAvailableFaculty,
  type InvigilationDuty,
  type InvigilationDutyType,
  type VenueOverviewCard,
} from "@/modules/coe/api/invigilation";
import type { ExamSessionCode } from "@/modules/coe/api/shared";

type TabKey = "all" | "unfilled" | "awaiting_ack" | "reports";
const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All duties" },
  { key: "unfilled", label: "Unfilled slots" },
  { key: "awaiting_ack", label: "Awaiting acknowledgement" },
  { key: "reports", label: "Duty reports" },
];

type Status = "unfilled" | "assigned" | "acknowledged";

type Row = {
  key: string;
  duty: InvigilationDuty | null;
  slot: VenueOverviewCard | null;
  date: string;
  session: string;
  hallName: string;
  seats: number | null;
  facultyName: string | null;
  departmentCode: string | null;
  dutyType: InvigilationDutyType;
  status: Status;
};

const DUTY_TYPE_LABEL: Record<InvigilationDutyType, string> = { regular: "Regular", relief_pool: "Relief", squad: "Squad" };
const STATUS_LABEL: Record<Status, string> = { unfilled: "Blocked", assigned: "Assigned", acknowledged: "Acknowledged" };
const STATUS_TEXT_CLASS: Record<Status, string> = { unfilled: "text-danger-fg", assigned: "text-primary", acknowledged: "text-primary" };

function facultyDisplayName(f: { first_name: string; last_name: string }): string {
  return [f.first_name, f.last_name].filter(Boolean).join(" ");
}

/** Hall codes follow "<block>-<room>" (e.g. "A-201") — the block filter is derived from that prefix, no dedicated schema field for it. */
function blockOf(hallName: string): string | null {
  if (!hallName || hallName === "—") return null;
  const [prefix] = hallName.split("-");
  return prefix?.trim() || null;
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function CoeInvigilationPage() {
  const facultyDirectory = useFacultyDirectory();

  const [tab, setTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");
  const [session, setSession] = useState<"all" | "FN" | "AN">("all");
  const [block, setBlock] = useState<string>("all");
  const [status, setStatus] = useState<"all" | Status>("all");
  const [dutyType, setDutyType] = useState<"all" | InvigilationDutyType>("all");
  const [assigningSlot, setAssigningSlot] = useState<VenueOverviewCard | null>(null);
  const [globalAssignOpen, setGlobalAssignOpen] = useState(false);
  const [page, setPage] = useState(1);

  function changeFilter<T>(setter: (v: T) => void, value: T) {
    setter(value);
    setPage(1);
  }

  const duties = useInvigilationDuties();
  const unfilled = useUnfilledSlots();
  const stats = useInvigilationStats();
  const update = useUpdateInvigilationDuty();
  const acknowledge = useAcknowledgeInvigilationDuty();
  const remind = useRemindInvigilationDuty();
  const remove = useDeleteInvigilationDuty();
  const autoAssign = useAutoAssignInvigilation();

  const rows: Row[] = useMemo(() => {
    const dutyRows: Row[] = (duties.data?.data ?? []).map((d) => ({
      key: `duty-${d.id}`,
      duty: d,
      slot: null,
      date: d.duty_date,
      session: d.session,
      hallName: d.hall_plans.venues.name,
      seats: d.hall_plans.capacity ?? d.hall_plans.venues.capacity,
      facultyName: facultyDisplayName(d.faculty),
      departmentCode: d.faculty.departments?.code ?? null,
      dutyType: d.duty_type,
      status: d.acknowledged_at ? "acknowledged" : "assigned",
    }));
    const unfilledRows: Row[] = (unfilled.data ?? []).map((s) => ({
      key: `slot-${s.key}`,
      duty: null,
      slot: s,
      date: s.exam_date,
      session: s.session,
      hallName: s.venue.name,
      seats: s.venue.capacity,
      facultyName: null,
      departmentCode: s.department_code,
      dutyType: "regular",
      status: "unfilled",
    }));
    return [...dutyRows, ...unfilledRows].sort((a, b) => a.date.localeCompare(b.date));
  }, [duties.data, unfilled.data]);

  const tabCounts = useMemo(
    () => ({
      all: rows.length,
      unfilled: rows.filter((r) => r.status === "unfilled").length,
      awaiting_ack: rows.filter((r) => r.status === "assigned").length,
      reports: rows.filter((r) => r.status !== "unfilled" && new Date(r.date) < new Date()).length,
    }),
    [rows],
  );

  const blocks = useMemo(() => [...new Set(rows.map((r) => blockOf(r.hallName)).filter((b): b is string => b !== null))].sort(), [rows]);

  const filtered = rows.filter((r) => {
    if (tab === "unfilled" && r.status !== "unfilled") return false;
    if (tab === "awaiting_ack" && r.status !== "assigned") return false;
    if (tab === "reports" && (r.status === "unfilled" || new Date(r.date) >= new Date())) return false;
    if (session !== "all" && r.session !== session) return false;
    if (block !== "all" && blockOf(r.hallName) !== block) return false;
    if (status !== "all" && r.status !== status) return false;
    if (dutyType !== "all" && r.dutyType !== dutyType) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      if (!(r.facultyName ?? "").toLowerCase().includes(q) && !r.hallName.toLowerCase().includes(q)) return false;
    }
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / DEFAULT_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * DEFAULT_PAGE_SIZE, safePage * DEFAULT_PAGE_SIZE);

  function handleExport() {
    downloadCsv(
      "invigilation",
      [
        { header: "Date", value: (r: Row) => r.date },
        { header: "Session", value: (r: Row) => r.session },
        { header: "Hall", value: (r: Row) => r.hallName },
        { header: "Faculty", value: (r: Row) => r.facultyName ?? "" },
        { header: "Department", value: (r: Row) => r.departmentCode ?? "" },
        { header: "Duty type", value: (r: Row) => DUTY_TYPE_LABEL[r.dutyType] },
        { header: "Status", value: (r: Row) => STATUS_LABEL[r.status] },
      ],
      filtered,
    );
  }

  const facultyOptions = (facultyDirectory.data ?? []).map((f) => ({ id: f.id, name: f.name }));

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <CoePageHeader
        title="Invigilation"
        subtitle="Faculty duty allocation, hall-wise assignment, acknowledgement and duty reports."
        actions={
          <>
            <Button variant="secondary" className="w-auto inline-flex items-center gap-1.5" onClick={handleExport}>
              <Icon name="download" size={16} />
              Export
            </Button>
            <Button variant="primarySmall" className="inline-flex items-center gap-1.5 px-5 py-3" onClick={() => setGlobalAssignOpen(true)}>
              <Icon name="add" size={16} />
              Assign duty
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Invigilators assigned"
          value={stats.data?.assigned ?? 0}
          icon="groups"
          sub={stats.data?.required ? `${Math.round((stats.data.assigned / stats.data.required) * 1000) / 10}% of required` : undefined}
        />
        <StatCard
          label="Unfilled duty slots"
          value={stats.data?.unfilled_slots ?? 0}
          icon="event_busy"
          sub={
            stats.data?.next_unfilled_date
              ? `${shortDate(stats.data.next_unfilled_date)} ${stats.data.next_unfilled_session === "FN" ? "forenoon" : "afternoon"} session`
              : "none"
          }
        />
        <StatCard label="Acknowledged" value={stats.data?.acknowledged ?? 0} icon="task_alt" sub={stats.data ? `${stats.data.acknowledged_pct}% of assigned` : undefined} />
        <StatCard label="Relief invigilators" value={stats.data?.relief_invigilators ?? 0} icon="swap_horiz" sub="on standby" />
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
          <SearchBar placeholder="Search faculty, hall or session…" value={search} onChange={(e) => changeFilter(setSearch, e.target.value)} className="max-w-[300px]" />
          <Select value={session} onChange={(e) => changeFilter(setSession, e.target.value as typeof session)} className="w-auto min-w-[130px]">
            <option value="all">All sessions</option>
            <option value="FN">Forenoon</option>
            <option value="AN">Afternoon</option>
          </Select>
          <Select value={block} onChange={(e) => changeFilter(setBlock, e.target.value)} className="w-auto min-w-[130px]">
            <option value="all">All blocks</option>
            {blocks.map((b) => (
              <option key={b} value={b}>
                Block {b}
              </option>
            ))}
          </Select>
          <Select value={status} onChange={(e) => changeFilter(setStatus, e.target.value as typeof status)} className="w-auto min-w-[130px]">
            <option value="all">All status</option>
            <option value="assigned">Assigned</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="unfilled">Blocked</option>
          </Select>
          <Select value={dutyType} onChange={(e) => changeFilter(setDutyType, e.target.value as typeof dutyType)} className="w-auto min-w-[150px]">
            <option value="all">All duty types</option>
            <option value="regular">Regular</option>
            <option value="relief_pool">Relief</option>
            <option value="squad">Squad</option>
          </Select>
          <span className="ml-auto text-[13px] text-muted">{filtered.length} records</span>
        </div>

        {duties.isLoading || unfilled.isLoading ? (
          <div className="p-5">
            <SkeletonTable rows={6} />
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-5 py-6 text-[13px] text-subtle">No duties match the current filter.</p>
        ) : (
          <>
          <div className="flex flex-col">
            <div className="flex items-center gap-4 border-b border-divider bg-surface-subtle px-5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">
              <div className="w-[150px]">Date & session</div>
              <div className="flex-1">Hall</div>
              <div className="w-[160px]">Faculty</div>
              <div className="w-[110px]">Department</div>
              <div className="w-[100px]">Duty type</div>
              <div className="w-[110px]">Status</div>
              <div className="w-[230px] text-right"> </div>
            </div>
            {pageRows.map((r) => (
              <RowView
                key={r.key}
                row={r}
                facultyOptions={facultyOptions}
                onSwap={(facultyId) => (r.duty ? update.mutateAsync({ id: r.duty.id, faculty_id: facultyId }) : Promise.resolve())}
                onRemove={() => (r.duty ? remove.mutateAsync(r.duty.id) : Promise.resolve())}
                // Reminding a faculty member also records the acknowledgement — there's no
                // separate "Acknowledge" action in this UI, per instruction.
                onRemind={() => (r.duty ? Promise.all([remind.mutateAsync(r.duty.id), acknowledge.mutateAsync(r.duty.id)]) : Promise.resolve())}
                onAssign={() => r.slot && setAssigningSlot(r.slot)}
                onAuto={() =>
                  r.slot
                    ? autoAssign.mutateAsync({ exam_id: r.slot.exam_id, hall_plan_id: r.slot.hall_plan_id, duty_date: r.slot.exam_date, session: r.slot.session })
                    : Promise.resolve()
                }
              />
            ))}
          </div>
          <Pagination page={safePage} pageSize={DEFAULT_PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
          </>
        )}
      </Card>

      <AssignDutyModal
        open={assigningSlot != null || globalAssignOpen}
        initialSlot={assigningSlot}
        onClose={() => {
          setAssigningSlot(null);
          setGlobalAssignOpen(false);
        }}
      />
    </div>
  );
}

function RowView({
  row: r,
  facultyOptions,
  onSwap,
  onRemove,
  onRemind,
  onAssign,
  onAuto,
}: {
  row: Row;
  facultyOptions: { id: number; name: string }[];
  onSwap: (facultyId: number) => Promise<unknown>;
  onRemove: () => Promise<unknown>;
  onRemind: () => Promise<unknown>;
  onAssign: () => void;
  onAuto: () => Promise<unknown>;
}) {
  const [swapping, setSwapping] = useState(false);
  // Each button owns its own loading flag — clicking one must never disable
  // its siblings, in this row or any other row.
  const [swapBusy, setSwapBusy] = useState(false);
  const [removeBusy, setRemoveBusy] = useState(false);
  const [remindBusy, setRemindBusy] = useState(false);
  const [autoBusy, setAutoBusy] = useState(false);

  async function runSwap(facultyId: number) {
    setSwapBusy(true);
    try {
      await onSwap(facultyId);
    } finally {
      setSwapBusy(false);
    }
  }

  async function runRemove() {
    setRemoveBusy(true);
    try {
      await onRemove();
    } finally {
      setRemoveBusy(false);
    }
  }

  async function runRemind() {
    setRemindBusy(true);
    try {
      await onRemind();
    } finally {
      setRemindBusy(false);
    }
  }

  async function runAuto() {
    setAutoBusy(true);
    try {
      await onAuto();
    } finally {
      setAutoBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-4 border-b border-divider px-5 py-4 last:border-0">
      <div className="w-[150px] min-w-0 shrink-0">
        <div className="text-[13px] font-bold text-ink">{new Date(r.date).toLocaleDateString()}</div>
        <div className="text-[11.5px] text-muted">{r.session === "FN" ? "Forenoon" : "Afternoon"}</div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12.5px] text-ink">{r.hallName}</div>
        {r.seats != null && <div className="text-[11px] text-muted">{r.seats} seats</div>}
      </div>
      <div className="w-[160px] min-w-0 shrink-0">
        {swapping ? (
          <select
            autoFocus
            className="w-full rounded-input border border-border-default bg-surface px-2 py-1.5 text-[12px]"
            onChange={(e) => {
              if (e.target.value) runSwap(Number(e.target.value));
              setSwapping(false);
            }}
            onBlur={() => setSwapping(false)}
          >
            <option value="">Choose faculty…</option>
            {facultyOptions.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        ) : (
          <>
            <div className="truncate text-[12.5px] font-bold text-ink">{r.facultyName ?? "—"}</div>
            {!r.facultyName && <div className="text-[11px] text-muted">Slot open</div>}
          </>
        )}
      </div>
      <div className="w-[110px] min-w-0 shrink-0 truncate text-[12.5px] text-ink">{r.departmentCode ?? "—"}</div>
      <div className="w-[100px] min-w-0 shrink-0">
        <Badge tone="neutral" className="max-w-full truncate">
          {DUTY_TYPE_LABEL[r.dutyType]}
        </Badge>
      </div>
      <div className="w-[110px] min-w-0 shrink-0">
        <span className={cn("block truncate text-[12.5px] font-extrabold", STATUS_TEXT_CLASS[r.status])}>{STATUS_LABEL[r.status]}</span>
      </div>
      <div className="flex w-[230px] flex-wrap justify-end gap-x-2 gap-y-1">
        {r.status === "unfilled" ? (
          <>
            <button type="button" className="text-[12.5px] font-bold text-primary hover:underline" onClick={onAssign}>
              Assign
            </button>
            <button
              type="button"
              className="text-[12.5px] font-bold text-primary hover:underline disabled:opacity-40"
              disabled={autoBusy}
              onClick={runAuto}
            >
              {autoBusy ? "Assigning…" : "Auto"}
            </button>
          </>
        ) : (
          <>
            {r.status === "assigned" && (
              <button
                type="button"
                className="text-[12.5px] font-bold text-primary hover:underline disabled:opacity-40"
                disabled={remindBusy}
                onClick={runRemind}
              >
                {remindBusy ? "Sending…" : "Remind"}
              </button>
            )}
            <button
              type="button"
              className="text-[12.5px] font-bold text-primary hover:underline disabled:opacity-40"
              disabled={swapBusy}
              onClick={() => setSwapping(true)}
            >
              Swap
            </button>
            <button
              type="button"
              className="text-[12.5px] font-bold text-danger-fg hover:underline disabled:opacity-40"
              disabled={removeBusy}
              onClick={runRemove}
            >
              {removeBusy ? "Removing…" : "Remove"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const SELECT_CLASS =
  "w-full rounded-input border border-border-default bg-surface px-3 py-2.5 text-sm text-ink focus:border-border-accent focus:outline-none disabled:bg-surface-subtle disabled:text-muted";

function StaticField({ children }: { children: React.ReactNode }) {
  return <div className="w-full rounded-input border border-border-default bg-surface-subtle px-3 py-2.5 text-sm text-ink">{children}</div>;
}

function sessionName(s: ExamSessionCode): string {
  return s === "FN" ? "Forenoon" : "Afternoon";
}

function longDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function AssignDutyModal({
  open,
  initialSlot,
  onClose,
}: {
  open: boolean;
  initialSlot: VenueOverviewCard | null;
  onClose: () => void;
}) {
  const create = useCreateInvigilationDuty();
  const venuesOverview = useVenuesOverview({});
  const allCards = useMemo(() => venuesOverview.data?.venues ?? [], [venuesOverview.data]);
  const locked = initialSlot != null;

  const [date, setDate] = useState("");
  const [session, setSession] = useState<ExamSessionCode | "">("");
  const [hallPlanId, setHallPlanId] = useState<number | "">("");
  const [dutyType, setDutyType] = useState<InvigilationDutyType>("regular");

  const [facultyId, setFacultyId] = useState<number | null>(null);
  const [facultySearch, setFacultySearch] = useState("");
  const [facultyOpen, setFacultyOpen] = useState(false);

  const dates = useMemo(() => [...new Set(allCards.map((c) => c.exam_date))].sort(), [allCards]);
  const cardsForDate = useMemo(() => allCards.filter((c) => c.exam_date === date), [allCards, date]);
  const sessionsForDate = useMemo(() => [...new Set(cardsForDate.map((c) => c.session))], [cardsForDate]);
  const cardsForSession = useMemo(() => cardsForDate.filter((c) => c.session === session), [cardsForDate, session]);

  const selectedCard = locked ? initialSlot : (cardsForSession.find((c) => c.hall_plan_id === hallPlanId) ?? null);
  const effectiveDate = locked ? initialSlot!.exam_date : date;
  const effectiveSession = locked ? initialSlot!.session : session;

  function sessionLabel(s: ExamSessionCode) {
    const matches = cardsForDate.filter((c) => c.session === s && c.start_time && c.end_time);
    if (matches.length === 0) return sessionName(s);
    const start = matches.map((c) => c.start_time!).sort()[0];
    const end = matches
      .map((c) => c.end_time!)
      .sort()
      .slice(-1)[0];
    return `${sessionName(s)} ${start}–${end}`;
  }

  const availableFaculty = useAvailableFaculty({
    date: effectiveDate || null,
    session: effectiveSession || null,
    start_time: selectedCard?.start_time ?? undefined,
    end_time: selectedCard?.end_time ?? undefined,
    search: facultySearch,
  });

  function reset() {
    setDate("");
    setSession("");
    setHallPlanId("");
    setDutyType("regular");
    setFacultyId(null);
    setFacultySearch("");
    setFacultyOpen(false);
    create.reset();
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleDateChange(next: string) {
    setDate(next);
    setSession("");
    setHallPlanId("");
    setFacultyId(null);
    setFacultySearch("");
  }

  function handleSessionChange(next: ExamSessionCode | "") {
    setSession(next);
    setHallPlanId("");
    setFacultyId(null);
    setFacultySearch("");
  }

  function handleSave() {
    if (!selectedCard || !facultyId) return;
    create.mutate(
      {
        exam_id: selectedCard.exam_id,
        hall_plan_id: selectedCard.hall_plan_id,
        faculty_id: facultyId,
        duty_date: selectedCard.exam_date,
        session: selectedCard.session,
        duty_type: dutyType,
      },
      { onSuccess: handleClose },
    );
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Assign invigilation duty"
      subtitle="Allocate a faculty member to a hall and session. Conflicts with class timetable are checked on save."
    >
      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Date *</label>
          {locked ? (
            <StaticField>{longDate(initialSlot!.exam_date)}</StaticField>
          ) : (
            <select value={date} onChange={(e) => handleDateChange(e.target.value)} className={SELECT_CLASS}>
              <option value="">Choose a date…</option>
              {dates.map((d) => (
                <option key={d} value={d}>
                  {longDate(d)}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Session</label>
          {locked ? (
            <StaticField>
              {sessionName(initialSlot!.session)}
              {initialSlot!.start_time && initialSlot!.end_time ? ` ${initialSlot!.start_time}–${initialSlot!.end_time}` : ""}
            </StaticField>
          ) : (
            <select
              value={session}
              disabled={!date}
              onChange={(e) => handleSessionChange(e.target.value as ExamSessionCode | "")}
              className={SELECT_CLASS}
            >
              <option value="">Choose a session…</option>
              {sessionsForDate.map((s) => (
                <option key={s} value={s}>
                  {sessionLabel(s)}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Hall</label>
          {locked ? (
            <StaticField>{initialSlot!.venue.name}</StaticField>
          ) : (
            <select
              value={hallPlanId}
              disabled={!session}
              onChange={(e) => setHallPlanId(e.target.value ? Number(e.target.value) : "")}
              className={SELECT_CLASS}
            >
              <option value="">Choose a hall…</option>
              {cardsForSession.map((c) => (
                <option key={c.hall_plan_id} value={c.hall_plan_id}>
                  {c.venue.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="relative">
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Faculty *</label>
          <input
            type="text"
            value={facultySearch}
            disabled={!effectiveDate || !effectiveSession}
            placeholder="Search by name or staff ID"
            onChange={(e) => {
              setFacultySearch(e.target.value);
              setFacultyId(null);
              setFacultyOpen(true);
            }}
            onFocus={() => setFacultyOpen(true)}
            onBlur={() => setTimeout(() => setFacultyOpen(false), 150)}
            className="w-full rounded-input border border-border-default bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-subtle focus:border-border-accent focus:outline-none disabled:bg-surface-subtle disabled:text-muted"
          />
          {facultyOpen && effectiveDate && effectiveSession && (
            <div className="absolute z-10 mt-1 max-h-[220px] w-full overflow-y-auto rounded-input border border-border-default bg-surface shadow-modal">
              {availableFaculty.isLoading ? (
                <div className="px-3 py-2.5 text-[12.5px] text-muted">Searching…</div>
              ) : (availableFaculty.data ?? []).length === 0 ? (
                <div className="px-3 py-2.5 text-[12.5px] text-muted">No eligible faculty found.</div>
              ) : (
                (availableFaculty.data ?? []).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-surface-subtle"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setFacultyId(f.id);
                      setFacultySearch(f.name);
                      setFacultyOpen(false);
                    }}
                  >
                    <span className="text-[13px] font-bold text-ink">{f.name}</span>
                    <span className="text-[11px] text-muted">{[f.staff_code, f.designation].filter(Boolean).join(" · ")}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Duty type</label>
          <select value={dutyType} onChange={(e) => setDutyType(e.target.value as InvigilationDutyType)} className={SELECT_CLASS}>
            <option value="regular">Regular</option>
            <option value="relief_pool">Relief</option>
            <option value="squad">Squad</option>
          </select>
        </div>

        <p className="text-[12px] italic text-subtle">Faculty on leave or with a clashing duty are excluded automatically.</p>

        {create.isError && <p className="text-[12px] text-danger-fg">{(create.error as Error).message}</p>}

        <div className="flex gap-3 border-t border-divider pt-5">
          <Button variant="primarySmall" className="flex-[2] py-3" disabled={!selectedCard || !facultyId || create.isPending} onClick={handleSave}>
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
