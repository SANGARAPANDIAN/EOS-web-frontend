"use client";

import { useEffect, useState } from "react";
import { Card, StatCard, SearchBar, Select, Button, Badge, Banner, Modal, Pagination, DEFAULT_PAGE_SIZE } from "@/components/ui";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils/cn";
import { CoePageHeader } from "@/modules/coe/PageHeader";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { downloadCsv } from "@/lib/utils/csv";
import { useDepartments } from "@/modules/coe/api/reference";
import {
  useResultPublications,
  useResultPublicationStats,
  useScheduleResultRelease,
  type PublicationState,
  type ResultPublication,
} from "@/modules/coe/api/results";

type TabKey = "all" | PublicationState;
const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All sets" },
  { key: "embargo", label: "Under embargo" },
  { key: "live", label: "Live" },
  { key: "held_back", label: "Held back" },
];

const STATE_LABEL: Record<PublicationState, string> = { live: "Live", embargo: "Embargo", held_back: "Held back" };
const CHANNEL_OPTIONS = ["Portal", "SMS", "Email"];
const CHANNEL_PRESETS = [
  { value: "Portal", label: "Portal only" },
  { value: "Portal, SMS", label: "Portal + SMS" },
  { value: "Portal, Email", label: "Portal + Email" },
  { value: "Portal, SMS, Email", label: "Portal + SMS + Email" },
];

function resultSetLabel(r: ResultPublication): string {
  return r.exams.title ?? `${r.exams.academic_year} · Sem ${r.exams.semester}`;
}

function resultSetCode(r: ResultPublication): string {
  return `RS-${r.exams.academic_year.replace(/\D/g, "").slice(0, 4)}-${r.id}`;
}

/** ISO datetime -> the "YYYY-MM-DDTHH:mm" shape a `datetime-local` input needs, in the browser's own local time (matches how every other date in this page is displayed via toLocaleString). */
function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CoeResultPublicationPage() {
  const results = useResultPublications();
  const stats = useResultPublicationStats();
  const departments = useDepartments();
  const allRows = results.data ?? [];

  const [tab, setTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");
  const [departmentCode, setDepartmentCode] = useState<string>("all");
  const [channel, setChannel] = useState<string>("all");
  const [previewing, setPreviewing] = useState<ResultPublication | null>(null);
  const [editing, setEditing] = useState<ResultPublication | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  function changeFilter<T>(setter: (v: T) => void, value: T) {
    setter(value);
    setPage(1);
  }

  const tabCounts = {
    all: allRows.length,
    embargo: allRows.filter((r) => r.state === "embargo").length,
    live: allRows.filter((r) => r.state === "live").length,
    held_back: allRows.filter((r) => r.state === "held_back").length,
  };

  const filtered = allRows.filter((r) => {
    if (tab !== "all" && r.state !== tab) return false;
    if (departmentCode !== "all" && !r.scope.departments.includes(departmentCode)) return false;
    if (channel !== "all" && !(r.channels ?? "").toLowerCase().includes(channel.toLowerCase())) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      if (!`${resultSetLabel(r)} ${r.scope.label}`.toLowerCase().includes(q)) return false;
    }
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / DEFAULT_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * DEFAULT_PAGE_SIZE, safePage * DEFAULT_PAGE_SIZE);

  function handleExport() {
    downloadCsv(
      "result-publication",
      [
        { header: "Result set", value: (r: ResultPublication) => resultSetLabel(r) },
        { header: "Code", value: (r: ResultPublication) => resultSetCode(r) },
        { header: "Scope", value: (r: ResultPublication) => r.scope.label },
        { header: "Candidates", value: (r: ResultPublication) => r.scope.candidates },
        { header: "Release at", value: (r: ResultPublication) => r.scheduled_release_at ?? "" },
        { header: "Channels", value: (r: ResultPublication) => r.channels ?? "" },
        { header: "Withheld", value: (r: ResultPublication) => r.withheld.total },
        { header: "State", value: (r: ResultPublication) => STATE_LABEL[r.state] },
      ],
      filtered,
    );
  }

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <CoePageHeader
        title="Result Publication"
        subtitle="Embargo, portal release, dispatch channels and rollback for every published result set."
        actions={
          <>
            <Button variant="secondary" className="w-auto inline-flex items-center gap-1.5" onClick={handleExport}>
              <Icon name="download" size={16} />
              Export
            </Button>
            <Button variant="primarySmall" className="inline-flex items-center gap-1.5 px-5 py-3" disabled={allRows.length === 0} onClick={() => setScheduleOpen(true)}>
              <Icon name="add" size={16} />
              Schedule release
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
        <StatCard label="Sets published" value={stats.data?.sets_published ?? 0} icon="publish" sub="live on the student portal" />
        <StatCard
          label="Under embargo"
          value={stats.data?.under_embargo ?? 0}
          icon="lock_clock"
          sub={stats.data?.nearest_embargo_release ? `releases ${new Date(stats.data.nearest_embargo_release).toLocaleString()}` : "none scheduled"}
        />
        <StatCard
          label="Withheld results"
          value={stats.data?.withheld_total ?? 0}
          icon="block"
          sub={`${stats.data?.withheld_malpractice ?? 0} UFM · ${stats.data?.withheld_dues ?? 0} dues`}
        />
        <StatCard
          label="Candidates covered"
          value={stats.data?.candidates_covered ?? 0}
          icon="groups"
          sub={`across ${stats.data?.live_set_count ?? 0} live set${stats.data?.live_set_count === 1 ? "" : "s"}`}
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
          <SearchBar placeholder="Search result set or programme…" value={search} onChange={(e) => changeFilter(setSearch, e.target.value)} className="max-w-[300px]" />
          <Select value={departmentCode} onChange={(e) => changeFilter(setDepartmentCode, e.target.value)} className="w-auto min-w-[150px]">
            <option value="all">All programmes</option>
            {(departments.data ?? []).map((d) => (
              <option key={d.id} value={d.code}>
                {d.code}
              </option>
            ))}
          </Select>
          <Select value={tab} onChange={(e) => changeFilter(setTab, e.target.value as TabKey)} className="w-auto min-w-[130px]">
            <option value="all">All states</option>
            <option value="embargo">Embargo</option>
            <option value="live">Live</option>
            <option value="held_back">Held back</option>
          </Select>
          <Select value={channel} onChange={(e) => changeFilter(setChannel, e.target.value)} className="w-auto min-w-[140px]">
            <option value="all">All channels</option>
            {CHANNEL_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <span className="ml-auto text-[13px] text-muted">{filtered.length} records</span>
        </div>

        {results.isLoading ? (
          <div className="p-5">
            <SkeletonTable rows={5} />
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-5 py-6 text-[13px] text-subtle">No result sets match the current filters.</p>
        ) : (
          <>
            <div className="flex flex-col">
              <div className="flex items-center gap-4 border-b border-divider bg-surface-subtle px-5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">
                <div className="flex-1">Result set</div>
                <div className="w-[190px]">Scope</div>
                <div className="w-[150px]">Release at</div>
                <div className="w-[140px]">Channels</div>
                <div className="w-[80px]">Withheld</div>
                <div className="w-[100px]">State</div>
                <div className="w-[130px] text-right"> </div>
              </div>
              {pageRows.map((r) => (
                <ResultRow key={r.id} row={r} onPreview={() => setPreviewing(r)} onEdit={() => setEditing(r)} onError={setRowError} />
              ))}
            </div>
            <Pagination page={safePage} pageSize={DEFAULT_PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
          </>
        )}
      </Card>

      <PreviewModal row={previewing} onClose={() => setPreviewing(null)} />
      <ScheduleModal row={editing} allRows={allRows} onClose={() => setEditing(null)} />
      <ScheduleModal row={null} allRows={allRows} open={scheduleOpen} onClose={() => setScheduleOpen(false)} />
    </div>
  );
}

function ResultRow({
  row: r,
  onPreview,
  onEdit,
  onError,
}: {
  row: ResultPublication;
  onPreview: () => void;
  onEdit: () => void;
  onError: (message: string) => void;
}) {
  const schedule = useScheduleResultRelease();

  async function handleReleaseNow() {
    try {
      await schedule.mutateAsync({ id: r.id, state: "live" });
    } catch (err) {
      onError((err as Error).message || `Could not release ${resultSetCode(r)}.`);
    }
  }

  async function handleRollback() {
    try {
      await schedule.mutateAsync({ id: r.id, state: "embargo" });
    } catch (err) {
      onError((err as Error).message || `Could not roll back ${resultSetCode(r)}.`);
    }
  }

  return (
    <div className="flex items-center gap-4 border-b border-divider px-5 py-4 last:border-0">
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13.5px] font-bold text-ink">{resultSetLabel(r)}</div>
        <div className="truncate text-[11.5px] text-muted">{resultSetCode(r)}</div>
      </div>
      <div className="w-[190px] min-w-0 shrink-0">
        <div className="truncate text-[12.5px] font-bold text-ink">{r.scope.label}</div>
        <div className="truncate text-[11px] text-muted">{r.scope.candidates.toLocaleString()} candidates</div>
      </div>
      <div className="w-[150px] shrink-0 text-[12px] text-ink">{r.scheduled_release_at ? new Date(r.scheduled_release_at).toLocaleString() : "Not scheduled"}</div>
      <div className="w-[140px] min-w-0 shrink-0 truncate text-[12px] text-ink">{r.channels ?? "Portal"}</div>
      <div className="w-[80px] shrink-0 text-[12.5px] font-bold text-ink">{r.withheld.total || "—"}</div>
      <div className="w-[100px] min-w-0 shrink-0">
        <Badge tone="neutral" className="max-w-full truncate">
          {STATE_LABEL[r.state]}
        </Badge>
      </div>
      <div className="flex w-[130px] shrink-0 flex-wrap justify-end gap-x-2 gap-y-1">
        <button type="button" className="text-[12.5px] font-bold text-primary hover:underline" onClick={onPreview}>
          {r.state === "live" ? "View" : "Preview"}
        </button>
        {r.state === "live" ? (
          r.can_rollback && (
            <button
              type="button"
              className="text-[12.5px] font-bold text-danger-fg hover:underline disabled:opacity-40"
              disabled={schedule.isPending}
              onClick={handleRollback}
            >
              {schedule.isPending ? "Rolling back…" : "Rollback"}
            </button>
          )
        ) : r.state === "held_back" ? (
          // Held back is a deliberate pause — only a real schedule (via the
          // modal) can move it forward, no one-click "Release" shortcut.
          <button type="button" className="text-[12.5px] font-bold text-primary hover:underline" onClick={onEdit}>
            Schedule
          </button>
        ) : (
          <>
            <button type="button" className="text-[12.5px] font-bold text-primary hover:underline" onClick={onEdit}>
              Edit
            </button>
            <button
              type="button"
              className="text-[12.5px] font-bold text-primary hover:underline disabled:opacity-40"
              disabled={schedule.isPending}
              onClick={handleReleaseNow}
            >
              {schedule.isPending ? "Releasing…" : "Release"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function PreviewModal({ row, onClose }: { row: ResultPublication | null; onClose: () => void }) {
  return (
    <Modal open={row != null} onClose={onClose} title="Result set preview" subtitle={row ? resultSetLabel(row) : undefined}>
      {row && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-input border border-border-default p-3">
              <div className="text-[11px] font-bold uppercase tracking-wide text-muted">Scope</div>
              <div className="mt-1 text-[13.5px] font-bold text-ink">{row.scope.label}</div>
              <div className="text-[11.5px] text-muted">{row.scope.candidates.toLocaleString()} candidates registered</div>
            </div>
            <div className="rounded-input border border-border-default p-3">
              <div className="text-[11px] font-bold uppercase tracking-wide text-muted">Withheld</div>
              <div className="mt-1 text-[13.5px] font-bold text-ink">{row.withheld.total} candidates</div>
              <div className="text-[11.5px] text-muted">
                {row.withheld.malpractice} malpractice · {row.withheld.dues} unpaid dues
              </div>
            </div>
          </div>
          <div className="rounded-input border border-border-default p-3">
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted">Release</div>
            <div className="mt-1 text-[13px] text-ink">
              {row.scheduled_release_at ? new Date(row.scheduled_release_at).toLocaleString() : "Not scheduled"} · {row.channels ?? "Portal"}
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

function ScheduleModal({
  row,
  allRows,
  open,
  onClose,
}: {
  row: ResultPublication | null;
  allRows: ResultPublication[];
  open?: boolean;
  onClose: () => void;
}) {
  const schedule = useScheduleResultRelease();
  const [pickedId, setPickedId] = useState<number | "">("");
  const [releaseAt, setReleaseAt] = useState("");
  const [channels, setChannels] = useState("Portal");

  const isOpen = row != null || open === true;
  const activeRow = row ?? allRows.find((r) => r.id === pickedId) ?? null;

  // Editing an existing schedule must start from its real current values —
  // otherwise saving without touching every field would silently overwrite
  // an already-set release time or channel list with these defaults.
  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    if (row) {
      setReleaseAt(row.scheduled_release_at ? toDatetimeLocalValue(row.scheduled_release_at) : "");
      setChannels(row.channels ?? "Portal");
    }
  }, [row?.id]);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  function reset() {
    setPickedId("");
    setReleaseAt("");
    setChannels("Portal");
    schedule.reset();
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleSave(state: PublicationState) {
    if (!activeRow) return;
    schedule.mutate({ id: activeRow.id, scheduled_release_at: releaseAt || undefined, channels, state }, { onSuccess: handleClose });
  }

  return (
    <Modal open={isOpen} onClose={handleClose} title="Schedule a release" subtitle="The set stays invisible to students until the embargo lifts. Withheld candidates see a hold notice instead of marks.">
      <div className="flex flex-col gap-4">
        {!row && (
          <div>
            <label className="mb-1.5 block text-[13px] font-bold text-ink">Result set</label>
            <select
              value={pickedId}
              onChange={(e) => setPickedId(e.target.value ? Number(e.target.value) : "")}
              className="w-full rounded-input border border-border-default bg-surface px-3 py-2.5 text-sm text-ink focus:border-border-accent focus:outline-none"
            >
              <option value="">Choose a result set…</option>
              {allRows.map((r) => (
                <option key={r.id} value={r.id}>
                  {resultSetLabel(r)} · {resultSetCode(r)}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Release date &amp; time *</label>
          <input
            type="datetime-local"
            value={releaseAt}
            onChange={(e) => setReleaseAt(e.target.value)}
            className="w-full rounded-input border border-border-default bg-surface px-3 py-2.5 text-sm text-ink focus:border-border-accent focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Channels</label>
          <select
            value={channels}
            onChange={(e) => setChannels(e.target.value)}
            className="w-full rounded-input border border-border-default bg-surface px-3 py-2.5 text-sm text-ink focus:border-border-accent focus:outline-none"
          >
            {CHANNEL_PRESETS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {schedule.isError && <p className="text-[12px] text-danger-fg">{(schedule.error as Error).message}</p>}

        <div className="flex flex-wrap gap-3 border-t border-divider pt-5">
          <Button variant="primarySmall" className="flex-[2] py-3" disabled={!activeRow || !releaseAt || schedule.isPending} onClick={() => handleSave("embargo")}>
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
