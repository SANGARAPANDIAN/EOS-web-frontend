"use client";

import { useState } from "react";
import { Card, StatCard, SearchBar, Select, Button, Badge, Modal, Pagination, DEFAULT_PAGE_SIZE } from "@/components/ui";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils/cn";
import { CoePageHeader } from "@/modules/coe/PageHeader";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { downloadCsv } from "@/lib/utils/csv";
import { useMe } from "@/modules/coe/api/identity";
import {
  useConfidentialEvents,
  useConfidentialEventStats,
  useCreateConfidentialEvent,
  type ConfidentialEvent,
  type ConfidentialEventType,
} from "@/modules/coe/api/confidentialAccessLog";

type TabKey = "all" | "strong_room_entry" | "file_access" | "seal_break";
const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All events" },
  { key: "strong_room_entry", label: "Strong room" },
  { key: "file_access", label: "File access" },
  { key: "seal_break", label: "Seal break" },
];

const EVENT_LABEL: Record<ConfidentialEventType, string> = {
  strong_room_entry: "Strong room entry",
  file_access: "File access",
  print_run: "Print run",
  seal_break: "Seal break",
  exception: "Exception",
};

/** Same June-cutoff academic-year boundary the shared topbar's AY badge uses (see lib/utils/date.ts) — "This cycle" tracks that same real boundary, not an arbitrary window. */
function isThisCycle(iso: string, now: Date): boolean {
  const cycleStart = new Date(Date.UTC(now.getUTCMonth() >= 5 ? now.getUTCFullYear() : now.getUTCFullYear() - 1, 5, 1));
  return new Date(iso) >= cycleStart;
}

/** Object descriptions follow the "<code> · <detail>" convention shown in the Record entry modal's own placeholder — split for the two-line display, single line if there's no separator. */
function splitObject(description: string): [string, string | null] {
  const idx = description.indexOf(" · ");
  if (idx === -1) return [description, null];
  return [description.slice(0, idx), description.slice(idx + 3)];
}

export default function CoeConfidentialAccessLogPage() {
  const me = useMe();
  const [tab, setTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");
  const [personFilter, setPersonFilter] = useState<number | null>(null);
  const [cycleOnly, setCycleOnly] = useState(true);
  const [recordOpen, setRecordOpen] = useState(false);
  const [trailEvent, setTrailEvent] = useState<ConfidentialEvent | null>(null);
  const [page, setPage] = useState(1);

  function changeFilter<T>(setter: (v: T) => void, value: T) {
    setter(value);
    setPage(1);
  }

  const stats = useConfidentialEventStats();
  const events = useConfidentialEvents({});
  const allRows = events.data ?? [];
  const now = new Date();

  const personsMap = new Map<number, string>();
  for (const e of allRows) personsMap.set(e.person_user_id, e.person.name);
  const persons = [...personsMap.entries()];

  const tabCounts = {
    all: allRows.length,
    strong_room_entry: allRows.filter((e) => e.event_type === "strong_room_entry").length,
    file_access: allRows.filter((e) => e.event_type === "file_access").length,
    seal_break: allRows.filter((e) => e.event_type === "seal_break").length,
  };

  const filtered = allRows.filter((e) => {
    if (tab !== "all" && e.event_type !== tab) return false;
    if (personFilter != null && e.person_user_id !== personFilter) return false;
    if (cycleOnly && !isThisCycle(e.occurred_at, now)) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const hay = [e.person.name, e.object_description, e.verification_method].join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / DEFAULT_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * DEFAULT_PAGE_SIZE, safePage * DEFAULT_PAGE_SIZE);

  const strongRoomRows = allRows.filter((e) => e.event_type === "strong_room_entry");
  const strongRoomAllVerified = strongRoomRows.length > 0 && strongRoomRows.every((e) => e.witness_user_id != null);
  const cycleEventsCount = allRows.filter((e) => isThisCycle(e.occurred_at, now)).length;
  const lastException = [...allRows].filter((e) => e.event_type === "exception").sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))[0];

  function handleExport() {
    downloadCsv(
      "confidential-access-log",
      [
        { header: "Timestamp", value: (e: ConfidentialEvent) => new Date(e.occurred_at).toLocaleString() },
        { header: "Person", value: (e: ConfidentialEvent) => e.person.name },
        { header: "Role", value: (e: ConfidentialEvent) => e.person.role ?? "" },
        { header: "Event", value: (e: ConfidentialEvent) => EVENT_LABEL[e.event_type] },
        { header: "Object", value: (e: ConfidentialEvent) => e.object_description },
        { header: "Witness", value: (e: ConfidentialEvent) => e.witness?.name ?? e.witness_description ?? "" },
        { header: "Verification", value: (e: ConfidentialEvent) => e.verification_method },
      ],
      filtered,
    );
  }

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <CoePageHeader
        title="Confidential Access Log"
        subtitle="Every entry to the strong room, every question-paper file opened, and every seal broken — with witness and timestamp."
        actions={
          <>
            <Button variant="secondary" className="w-auto inline-flex items-center gap-1.5" onClick={handleExport}>
              <Icon name="download" size={16} />
              Export
            </Button>
            <Button variant="primarySmall" className="inline-flex items-center gap-1.5 px-5 py-3" onClick={() => setRecordOpen(true)}>
              <Icon name="add" size={16} />
              Record entry
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Events logged" value={stats.data?.events_logged ?? 0} icon="history" sub={`${cycleEventsCount} this cycle`} loading={stats.isLoading} />
        <StatCard
          label="Strong room entries"
          value={stats.data?.strong_room_entries ?? 0}
          icon="lock"
          sub={strongRoomRows.length > 0 ? (strongRoomAllVerified ? "all two-person verified" : "some unverified") : undefined}
          loading={stats.isLoading}
        />
        <StatCard label="Sealed papers" value={stats.data?.sealed_papers ?? 0} icon="inventory_2" sub="vaulted" loading={stats.isLoading} />
        <StatCard
          label="Exceptions raised"
          value={stats.data?.exceptions_raised ?? 0}
          icon="report"
          sub={lastException ? `last ${new Date(lastException.occurred_at).toLocaleDateString()}` : undefined}
          loading={stats.isLoading}
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
          <SearchBar placeholder="Search person, paper code or purpose…" value={search} onChange={(e) => changeFilter(setSearch, e.target.value)} className="max-w-[300px]" />
          <Select value={tab === "all" ? "all" : tab} onChange={(e) => changeFilter(setTab, e.target.value as TabKey)} className="w-auto min-w-[140px]">
            <option value="all">All events</option>
            <option value="strong_room_entry">Strong room entry</option>
            <option value="file_access">File access</option>
            <option value="seal_break">Seal break</option>
          </Select>
          <Select value={personFilter ?? ""} onChange={(e) => changeFilter(setPersonFilter, e.target.value ? Number(e.target.value) : null)} className="w-auto min-w-[140px]">
            <option value="">All persons</option>
            {persons.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </Select>
          <Select value={cycleOnly ? "cycle" : "all"} onChange={(e) => changeFilter(setCycleOnly, e.target.value === "cycle")} className="w-auto min-w-[130px]">
            <option value="cycle">This cycle</option>
            <option value="all">All time</option>
          </Select>
          <span className="ml-auto text-[13px] text-muted">{filtered.length} records</span>
        </div>

        {events.isLoading ? (
          <div className="p-5">
            <SkeletonTable rows={6} />
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-5 py-6 text-[13px] text-subtle">No events recorded yet.</p>
        ) : (
          <>
          <div className="flex flex-col">
            <div className="flex items-center gap-4 border-b border-divider bg-surface-subtle px-5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">
              <div className="w-[130px]">Timestamp</div>
              <div className="w-[170px]">Person</div>
              <div className="w-[140px]">Event</div>
              <div className="flex-1">Object</div>
              <div className="w-[150px]">Witness</div>
              <div className="w-[150px]">Verification</div>
              <div className="w-[60px] text-right"> </div>
            </div>
            {pageRows.map((e) => {
              const [objectMain, objectDetail] = splitObject(e.object_description);
              return (
                <div key={e.id} className="flex items-center gap-4 border-b border-divider px-5 py-4 last:border-0">
                  <div className="w-[130px] min-w-0 shrink-0">
                    <div className="text-[13px] font-bold text-ink">{new Date(e.occurred_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</div>
                    <div className="text-[11px] text-muted">{new Date(e.occurred_at).toLocaleTimeString("en-GB")}</div>
                  </div>
                  <div className="w-[170px] min-w-0 shrink-0">
                    <div className="truncate text-[12.5px] font-bold text-ink">{e.person.name}</div>
                    {e.person.role && <div className="truncate text-[11px] text-muted">{e.person.role}</div>}
                  </div>
                  <div className="w-[140px] min-w-0 shrink-0">
                    <Badge tone="neutral" className="max-w-full truncate">
                      {EVENT_LABEL[e.event_type]}
                    </Badge>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12.5px] text-ink">{objectMain}</div>
                    {objectDetail && <div className="truncate text-[11px] text-muted">{objectDetail}</div>}
                  </div>
                  <div className="w-[150px] min-w-0 shrink-0 truncate text-[12.5px] text-ink">{e.witness?.name ?? e.witness_description ?? "—"}</div>
                  <div className="w-[150px] min-w-0 shrink-0">
                    <Badge tone="neutral" className="max-w-full truncate">
                      {e.verification_method}
                    </Badge>
                  </div>
                  <div className="flex w-[60px] justify-end">
                    <button type="button" className="text-[12.5px] font-bold text-primary hover:underline" onClick={() => setTrailEvent(e)}>
                      Trail
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <Pagination page={safePage} pageSize={DEFAULT_PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
          </>
        )}
      </Card>

      <RecordEntryModal open={recordOpen} onClose={() => setRecordOpen(false)} currentUserLabel={me.data?.email ?? "—"} />
      <TrailModal event={trailEvent} onClose={() => setTrailEvent(null)} />
    </div>
  );
}

function TrailModal({ event, onClose }: { event: ConfidentialEvent | null; onClose: () => void }) {
  return (
    <Modal open={event != null} onClose={onClose} title="Audit trail" subtitle="Full record of this confidential-access event.">
      {event && (
        <div className="flex flex-col gap-3 text-[13px]">
          {[
            ["Timestamp", new Date(event.occurred_at).toLocaleString()],
            ["Person", `${event.person.name}${event.person.role ? ` · ${event.person.role}` : ""}`],
            ["Event", EVENT_LABEL[event.event_type]],
            ["Object", event.object_description],
            ["Witness", event.witness ? `${event.witness.name}${event.witness.role ? ` · ${event.witness.role}` : ""}` : (event.witness_description ?? "—")],
            ["Verification", event.verification_method],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-4 border-b border-divider pb-2.5 last:border-0">
              <span className="font-bold text-muted">{label}</span>
              <span className="text-right text-ink">{value}</span>
            </div>
          ))}
          <Button variant="secondary" className="mt-2 w-auto self-end" onClick={onClose}>
            Close
          </Button>
        </div>
      )}
    </Modal>
  );
}

function RecordEntryModal({ open, onClose, currentUserLabel }: { open: boolean; onClose: () => void; currentUserLabel: string }) {
  const create = useCreateConfidentialEvent();
  const [eventType, setEventType] = useState<ConfidentialEventType>("strong_room_entry");
  const [object, setObject] = useState("");
  const [witness, setWitness] = useState("");
  const [reason, setReason] = useState("");

  function reset() {
    setEventType("strong_room_entry");
    setObject("");
    setWitness("");
    setReason("");
    create.reset();
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleSave() {
    if (!object.trim()) return;
    create.mutate(
      {
        event_type: eventType,
        object_description: object.trim(),
        witness_description: witness.trim() || undefined,
        verification_method: reason.trim() ? `Manual entry — ${reason.trim()}` : "Manual entry",
      },
      { onSuccess: handleClose },
    );
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Record a manual entry"
      subtitle="Only for events the biometric reader could not capture. Manual entries are flagged in the audit report and need a witness signature."
    >
      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Person</label>
          <div className="w-full rounded-input border border-border-default bg-surface-subtle px-3 py-2.5 text-sm text-ink">{currentUserLabel}</div>
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Event type</label>
          <select
            value={eventType}
            onChange={(e) => setEventType(e.target.value as ConfidentialEventType)}
            className="w-full rounded-input border border-border-default bg-surface px-3 py-2.5 text-sm text-ink focus:border-border-accent focus:outline-none"
          >
            {Object.entries(EVENT_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Object *</label>
          <input
            type="text"
            value={object}
            onChange={(e) => setObject(e.target.value)}
            placeholder="e.g. QP-23CS601-SET-A"
            className="w-full rounded-input border border-border-default bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-subtle focus:border-border-accent focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Witness</label>
          <input
            type="text"
            value={witness}
            onChange={(e) => setWitness(e.target.value)}
            placeholder="Name and designation"
            className="w-full rounded-input border border-border-default bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-subtle focus:border-border-accent focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Reason for manual entry</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="e.g. biometric reader offline"
            className="w-full resize-y rounded-input border border-border-default bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-subtle focus:border-border-accent focus:outline-none"
          />
        </div>

        {create.isError && <p className="text-[12px] text-danger-fg">{(create.error as Error).message}</p>}

        <div className="flex gap-3 border-t border-divider pt-5">
          <Button variant="primarySmall" className="flex-[2] py-3" disabled={!object.trim() || create.isPending} onClick={handleSave}>
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
