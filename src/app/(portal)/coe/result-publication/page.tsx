"use client";

import { useMemo, useState } from "react";
import { Card, StatCard, PillTabs, SearchBar, Select, Input, Button, Badge, Modal, type BadgeTone } from "@/components/ui";
import { CoePageHeader } from "@/modules/coe/PageHeader";
import { SkeletonTable } from "@/components/ui/Skeleton";
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

const TONE: Record<PublicationState, BadgeTone> = { live: "accentDark", embargo: "accent", held_back: "danger" };
const LABEL: Record<PublicationState, string> = { live: "Live", embargo: "Embargo", held_back: "Held back" };
const CHANNEL_OPTIONS = ["Portal", "SMS", "Email"];

export default function CoeResultPublicationPage() {
  const results = useResultPublications();
  const stats = useResultPublicationStats();
  const departments = useDepartments();

  const [tab, setTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");
  const [departmentCode, setDepartmentCode] = useState<string>("all");
  const [channel, setChannel] = useState<string>("all");
  const [previewing, setPreviewing] = useState<ResultPublication | null>(null);
  const [editing, setEditing] = useState<ResultPublication | null>(null);

  const rows = useMemo(() => {
    let list = results.data ?? [];
    if (tab !== "all") list = list.filter((r) => r.state === tab);
    if (departmentCode !== "all") list = list.filter((r) => r.scope.departments.includes(departmentCode));
    if (channel !== "all") list = list.filter((r) => (r.channels ?? "").toLowerCase().includes(channel.toLowerCase()));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((r) => `${r.exams.title ?? ""} ${r.exams.academic_year} ${r.exams.semester}`.toLowerCase().includes(q));
    }
    return list;
  }, [results.data, tab, departmentCode, channel, search]);

  const tabCounts = useMemo(() => {
    const all = results.data ?? [];
    return {
      all: all.length,
      embargo: all.filter((r) => r.state === "embargo").length,
      live: all.filter((r) => r.state === "live").length,
      held_back: all.filter((r) => r.state === "held_back").length,
    };
  }, [results.data]);

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <CoePageHeader
        title="Result Publication"
        subtitle="Embargo, portal release, dispatch channels and rollback for every published result set."
      />

      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Sets published" value={stats.data?.sets_published ?? 0} icon="publish" sub="live on the student portal" />
        <StatCard
          label="Under embargo"
          value={stats.data?.under_embargo ?? 0}
          icon="lock_clock"
          sub={stats.data?.nearest_embargo_release ? `releases ${new Date(stats.data.nearest_embargo_release).toLocaleDateString()}` : "none scheduled"}
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

      <Card>
        <PillTabs
          options={TABS.map((t) => ({ key: t.key, label: `${t.label} (${tabCounts[t.key]})` }))}
          value={tab}
          onChange={(k) => setTab(k as TabKey)}
        />
        <div className="mt-3 grid grid-cols-[1fr_180px_160px] gap-3">
          <SearchBar value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search result set or programme…" />
          <Select value={departmentCode} onChange={(e) => setDepartmentCode(e.target.value)}>
            <option value="all">All programmes</option>
            {(departments.data ?? []).map((d) => (
              <option key={d.id} value={d.code}>
                {d.code}
              </option>
            ))}
          </Select>
          <Select value={channel} onChange={(e) => setChannel(e.target.value)}>
            <option value="all">All channels</option>
            {CHANNEL_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {results.isLoading ? (
        <SkeletonTable rows={5} />
      ) : (
        <Card className="p-0">
          <div className="flex items-center justify-between border-b border-divider px-5 py-3.5">
            <span className="text-[15px] font-extrabold text-ink">Result sets</span>
            <span className="text-[12.5px] text-muted">{rows.length} records</span>
          </div>
          {rows.length === 0 ? (
            <p className="px-5 py-6 text-[13px] text-subtle">No result sets match the current filter.</p>
          ) : (
            <div className="flex flex-col">
              <div className="flex items-center gap-4 border-b border-divider bg-surface-subtle px-5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">
                <div className="flex-1">Result set</div>
                <div className="w-[190px]">Scope</div>
                <div className="w-[140px]">Release at</div>
                <div className="w-[150px]">Channels</div>
                <div className="w-[70px]">Withheld</div>
                <div className="w-[100px]">State</div>
                <div className="w-[140px] text-right">Actions</div>
              </div>
              {rows.map((r) => (
                <ResultRow key={r.id} row={r} onPreview={() => setPreviewing(r)} onEdit={() => setEditing(r)} />
              ))}
            </div>
          )}
        </Card>
      )}

      <PreviewModal row={previewing} onClose={() => setPreviewing(null)} />
      <ScheduleModal row={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function ResultRow({ row: r, onPreview, onEdit }: { row: ResultPublication; onPreview: () => void; onEdit: () => void }) {
  const rollback = useScheduleResultRelease();

  return (
    <div className="flex items-center gap-4 border-b border-divider px-5 py-4 last:border-0">
      <div className="flex-1">
        <div className="text-[13.5px] font-bold text-ink">
          {r.exams.title ?? `${r.exams.academic_year} · Sem ${r.exams.semester}`}
        </div>
        <div className="text-[11.5px] text-muted">RS-{r.exams.academic_year.replace(/\D/g, "").slice(0, 4)}-{r.id}</div>
      </div>
      <div className="w-[190px]">
        <div className="text-[12.5px] font-bold text-ink">{r.scope.label}</div>
        <div className="text-[11px] text-muted">{r.scope.candidates.toLocaleString()} candidates</div>
      </div>
      <div className="w-[140px] text-[12px] text-ink">{r.scheduled_release_at ? new Date(r.scheduled_release_at).toLocaleString() : "Not scheduled"}</div>
      <div className="w-[150px] text-[12px] text-ink">{r.channels ?? "Portal"}</div>
      <div className="w-[70px] text-[12.5px] font-bold text-ink">{r.withheld.total || "—"}</div>
      <div className="w-[100px]">
        <Badge tone={TONE[r.state]}>{LABEL[r.state].toUpperCase()}</Badge>
      </div>
      <div className="flex w-[140px] justify-end gap-2">
        <button type="button" className="text-[12.5px] font-bold text-primary hover:underline" onClick={onPreview}>
          {r.state === "live" ? "View" : "Preview"}
        </button>
        {r.state === "live" ? (
          r.can_rollback ? (
            <button
              type="button"
              className="text-[12.5px] font-bold text-danger-fg hover:underline disabled:opacity-40"
              disabled={rollback.isPending}
              onClick={() => rollback.mutate({ id: r.id, state: "embargo" })}
            >
              Rollback
            </button>
          ) : null
        ) : (
          <button type="button" className="text-[12.5px] font-bold text-primary hover:underline" onClick={onEdit}>
            {r.state === "held_back" ? "Schedule" : "Edit"}
          </button>
        )}
      </div>
    </div>
  );
}

function PreviewModal({ row, onClose }: { row: ResultPublication | null; onClose: () => void }) {
  return (
    <Modal open={row != null} onClose={onClose} title="Result set preview" subtitle={row ? (row.exams.title ?? `${row.exams.academic_year} · Sem ${row.exams.semester}`) : undefined}>
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
              <div className="text-[11.5px] text-muted">{row.withheld.malpractice} malpractice · {row.withheld.dues} unpaid dues</div>
            </div>
          </div>
          <div className="rounded-input border border-border-default p-3">
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted">Release</div>
            <div className="mt-1 text-[13px] text-ink">
              {row.scheduled_release_at ? new Date(row.scheduled_release_at).toLocaleString() : "Not scheduled"} · {row.channels ?? "Portal"}
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="secondary" className="w-auto" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function ScheduleModal({ row, onClose }: { row: ResultPublication | null; onClose: () => void }) {
  const schedule = useScheduleResultRelease();
  const [releaseAt, setReleaseAt] = useState("");
  const [channels, setChannels] = useState("Portal");

  function handleClose() {
    schedule.reset();
    onClose();
  }

  function handleSave(state: PublicationState) {
    if (!row) return;
    schedule.mutate({ id: row.id, scheduled_release_at: releaseAt || undefined, channels, state }, { onSuccess: handleClose });
  }

  return (
    <Modal open={row != null} onClose={handleClose} title="Schedule release" subtitle={row ? (row.exams.title ?? `${row.exams.academic_year} · Sem ${row.exams.semester}`) : undefined}>
      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Release at</label>
          <input type="datetime-local" value={releaseAt} onChange={(e) => setReleaseAt(e.target.value)} className="w-full rounded-input border border-border-default bg-surface px-[13px] py-[11px] text-sm text-ink" />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Channels</label>
          <Input value={channels} onChange={(e) => setChannels(e.target.value)} placeholder="Portal, SMS, Email" />
        </div>
        {schedule.isError && <p className="text-[12px] text-danger-fg">{(schedule.error as Error).message}</p>}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" className="w-auto" onClick={() => handleSave("held_back")}>
            Hold back
          </Button>
          <Button variant="secondary" className="w-auto" onClick={() => handleSave("embargo")}>
            Save embargo
          </Button>
          <Button variant="primarySmall" disabled={schedule.isPending} onClick={() => handleSave("live")}>
            Release now
          </Button>
        </div>
      </div>
    </Modal>
  );
}
