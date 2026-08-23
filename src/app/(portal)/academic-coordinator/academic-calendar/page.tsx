"use client";

import { useMemo, useState } from "react";
import { useBatches } from "@/modules/academic-structure/hooks/useAcademicStructureQueries";
import { useAcademicCalendarPeriods, useCalendarEvents } from "@/modules/academic-coordinator/hooks/useAcademicCalendarQueries";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { CalendarPeriodDialog } from "@/modules/academic-coordinator/components/CalendarPeriodDialog";
import { CalendarEventDialog } from "@/modules/academic-coordinator/components/CalendarEventDialog";
import type { AcademicCalendarPeriod, CalendarEventItem, CalendarEventType } from "@/modules/academic-coordinator/types";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DOW = ["S", "M", "T", "W", "T", "F", "S"];
const DOW_FULL = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

const EVENT_TONE: Record<CalendarEventType, BadgeTone> = {
  holiday: "neutral",
  event: "accent",
};

// event_date arrives as an ISO date string at UTC midnight — parsing its
// Y/M/D via the UTC getters (not the local getters) avoids the date
// shifting a day back for any viewer west of UTC.
function dateParts(iso: string) {
  const d = new Date(iso);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth(), day: d.getUTCDate() };
}

interface CalCell {
  day: number | null;
  inMonth: boolean;
  isToday: boolean;
  iso: string | null;
  events: CalendarEventItem[];
}

function buildMonthCells(year: number, month: number, events: CalendarEventItem[]): CalCell[] {
  const firstDow = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const todayIso = new Date().toISOString().slice(0, 10);

  const byDay = new Map<number, CalendarEventItem[]>();
  for (const e of events) {
    const p = dateParts(e.eventDate);
    if (p.year === year && p.month === month) {
      if (!byDay.has(p.day)) byDay.set(p.day, []);
      byDay.get(p.day)!.push(e);
    }
  }

  const cells: CalCell[] = [];
  for (let i = 0; i < firstDow; i++) cells.push({ day: null, inMonth: false, isToday: false, iso: null, events: [] });
  for (let day = 1; day <= daysInMonth; day++) {
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({ day, inMonth: true, isToday: iso === todayIso, iso, events: byDay.get(day) ?? [] });
  }
  while (cells.length % 7 !== 0) cells.push({ day: null, inMonth: false, isToday: false, iso: null, events: [] });
  return cells;
}

function CalendarPeriodView({
  period,
  batchName,
  onEditPeriod,
  onAddEvent,
  onEditEvent,
}: {
  period: AcademicCalendarPeriod;
  batchName: string;
  onEditPeriod: () => void;
  onAddEvent: (date: string) => void;
  onEditEvent: (event: CalendarEventItem) => void;
}) {
  const events = useCalendarEvents(period.id);
  const allEvents = useMemo(() => events.data ?? [], [events.data]);

  const initial = dateParts(period.startDate);
  const [cursor, setCursor] = useState({ year: initial.year, month: initial.month });

  const cells = useMemo(() => buildMonthCells(cursor.year, cursor.month, allEvents), [cursor, allEvents]);
  const monthEvents = useMemo(
    () =>
      allEvents
        .filter((e) => {
          const p = dateParts(e.eventDate);
          return p.year === cursor.year && p.month === cursor.month;
        })
        .sort((a, b) => a.eventDate.localeCompare(b.eventDate)),
    [allEvents, cursor],
  );

  function goPrev() {
    setCursor((c) => (c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 }));
  }
  function goNext() {
    setCursor((c) => (c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 }));
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] items-start gap-3.5">
      <Card>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={goPrev}
            className="grid size-9.5 cursor-pointer place-items-center rounded-[9px] border border-border-default bg-surface-muted text-[15px] text-body"
          >
            ‹
          </button>
          <div className="flex-1 text-center">
            <div className="text-[19px] font-bold tracking-[-.02em] text-ink">
              {MONTHS[cursor.month]} {cursor.year}
            </div>
            <div className="mt-0.5 text-[12.5px] text-subtle">
              {batchName} · Semester {period.semester} · {monthEvents.length} event{monthEvents.length === 1 ? "" : "s"}
            </div>
          </div>
          <button
            type="button"
            onClick={goNext}
            className="grid size-9.5 cursor-pointer place-items-center rounded-[9px] border border-border-default bg-surface-muted text-[15px] text-body"
          >
            ›
          </button>
        </div>

        <div className="mt-3 flex gap-2">
          <Button variant="secondary" className="w-full flex-1" onClick={onEditPeriod}>
            Edit period
          </Button>
        </div>

        <div className="mt-4.5 grid grid-cols-7 gap-2">
          {DOW.map((d, i) => (
            <div key={i} className="text-center text-xs font-semibold text-subtle">
              {d}
            </div>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-7 gap-2">
          {cells.map((c, i) => (
            <div
              key={i}
              title={c.events.length > 0 ? c.events.map((e) => e.title).join(", ") : c.iso ? "Add an event" : undefined}
              onClick={() => {
                if (!c.iso) return;
                if (c.events.length === 1) onEditEvent(c.events[0]);
                else if (c.events.length === 0) onAddEvent(c.iso);
              }}
              className={`flex min-h-[46px] flex-col items-center gap-1 rounded-[8px] border px-1 py-1.5 text-[12.5px] ${
                c.inMonth ? "text-ink" : "text-subtle"
              } ${c.isToday ? "border-primary bg-accent-50" : "border-transparent"} ${c.events.length > 0 && !c.isToday ? "bg-surface-muted" : ""} ${
                c.iso ? "cursor-pointer hover:border-border-accent" : ""
              }`}
            >
              <span className={c.isToday ? "font-bold" : "font-medium"}>{c.day ?? ""}</span>
              {c.events.length > 0 && (
                <span className={`size-[5px] rounded-full ${c.events[0].eventType === "holiday" ? "bg-body" : "bg-primary"}`} />
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div className="text-[17px] font-bold tracking-[-.01em] text-ink">Events in {MONTHS[cursor.month]}</div>
          <Button variant="primarySmall" onClick={() => onAddEvent(`${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}-01`)}>
            + Add event
          </Button>
        </div>
        <div className="mt-2 flex flex-col">
          {events.isLoading && <div className="px-0.5 py-3.5 text-[13px] text-subtle">Loading…</div>}
          {!events.isLoading && monthEvents.length === 0 && <div className="px-0.5 py-3.5 text-[13px] text-subtle">No events published this month.</div>}
          {monthEvents.map((e) => {
            const p = dateParts(e.eventDate);
            const dow = DOW_FULL[new Date(Date.UTC(p.year, p.month, p.day)).getUTCDay()];
            return (
              <div key={e.id} onClick={() => onEditEvent(e)} className="flex cursor-pointer items-center gap-3.5 border-t border-divider px-0.5 py-3.5 hover:bg-surface-muted">
                <div className="flex size-12 flex-none flex-col items-center justify-center rounded-[10px] bg-surface-tint leading-tight">
                  <span className="text-[15px] font-bold text-ink">{p.day}</span>
                  <span className="text-[9.5px] tracking-[.04em] text-subtle">{dow}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold tracking-[-.01em] text-ink">{e.title}</div>
                  <div className="mt-0.5 text-[12.5px] text-subtle">
                    {e.startTime ? `${e.startTime}–${e.endTime ?? ""}` : "All day"}
                    {e.description ? ` · ${e.description}` : ""}
                  </div>
                </div>
                <Badge tone={EVENT_TONE[e.eventType]}>{e.eventType}</Badge>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

export default function CoordinatorAcademicCalendarPage() {
  const batches = useBatches();
  const periods = useAcademicCalendarPeriods();

  const [batchId, setBatchId] = useState<number | "all">("all");
  const [semester, setSemester] = useState<number | "all">("all");
  const [periodDialogOpen, setPeriodDialogOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<AcademicCalendarPeriod | null>(null);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEventItem | null>(null);
  const [newEventDate, setNewEventDate] = useState<string | undefined>(undefined);

  const batchNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const b of batches.data ?? []) map.set(b.id, b.name);
    return map;
  }, [batches.data]);

  const filteredPeriods = useMemo(
    () => (periods.data ?? []).filter((p) => (batchId === "all" || p.batchId === batchId) && (semester === "all" || p.semester === semester)),
    [periods.data, batchId, semester],
  );

  const semesterOptions = useMemo(() => {
    const set = new Set((periods.data ?? []).filter((p) => batchId === "all" || p.batchId === batchId).map((p) => p.semester));
    return Array.from(set).sort((a, b) => a - b);
  }, [periods.data, batchId]);

  const selectedPeriod = useMemo(
    () => (filteredPeriods.length === 0 ? null : filteredPeriods.reduce((latest, p) => (p.endDate > latest.endDate ? p : latest), filteredPeriods[0])),
    [filteredPeriods],
  );

  function openCreatePeriod() {
    setEditingPeriod(null);
    setPeriodDialogOpen(true);
  }
  function openEditPeriod(p: AcademicCalendarPeriod) {
    setEditingPeriod(p);
    setPeriodDialogOpen(true);
  }
  function openAddEvent(date: string) {
    setEditingEvent(null);
    setNewEventDate(date);
    setEventDialogOpen(true);
  }
  function openEditEvent(e: CalendarEventItem) {
    setEditingEvent(e);
    setNewEventDate(undefined);
    setEventDialogOpen(true);
  }

  return (
    <div className="flex flex-col gap-4.5">
      <div className="flex flex-wrap items-end gap-5">
        <div className="min-w-70 flex-1">
          <h1 className="m-0 text-[26px] font-bold tracking-[-.02em] text-ink">Academic Calendar</h1>
          <p className="mt-1.5 text-[13px] text-muted">Publish semester periods and events for every batch — visible read-only across Placement and other portals.</p>
        </div>
        <div className="flex gap-2.5">
          <Select
            value={batchId === "all" ? "all" : String(batchId)}
            onChange={(e) => {
              setBatchId(e.target.value === "all" ? "all" : Number(e.target.value));
              setSemester("all");
            }}
          >
            <option value="all">All batches</option>
            {(batches.data ?? []).map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
          <Select value={semester === "all" ? "all" : String(semester)} onChange={(e) => setSemester(e.target.value === "all" ? "all" : Number(e.target.value))}>
            <option value="all">All semesters</option>
            {semesterOptions.map((s) => (
              <option key={s} value={s}>
                Semester {s}
              </option>
            ))}
          </Select>
          <Button variant="primarySmall" onClick={openCreatePeriod}>
            + New period
          </Button>
        </div>
      </div>

      {periods.isLoading ? (
        <div className="text-[13px] text-subtle">Loading calendar…</div>
      ) : !selectedPeriod ? (
        <Card className="text-center">
          <p className="m-0 text-[13px] text-subtle">No academic calendar published for this batch/semester yet.</p>
          <Button variant="primarySmall" className="mt-3.5 w-auto" onClick={openCreatePeriod}>
            + Create the first period
          </Button>
        </Card>
      ) : (
        <CalendarPeriodView
          key={selectedPeriod.id}
          period={selectedPeriod}
          batchName={batchNameById.get(selectedPeriod.batchId) ?? `Batch #${selectedPeriod.batchId}`}
          onEditPeriod={() => openEditPeriod(selectedPeriod)}
          onAddEvent={openAddEvent}
          onEditEvent={openEditEvent}
        />
      )}

      {periodDialogOpen && (
        <CalendarPeriodDialog key={`period-${editingPeriod?.id ?? "new"}`} open={periodDialogOpen} onClose={() => setPeriodDialogOpen(false)} period={editingPeriod} />
      )}

      {selectedPeriod && eventDialogOpen && (
        <CalendarEventDialog
          key={`event-${editingEvent?.id ?? newEventDate ?? "new"}`}
          open={eventDialogOpen}
          onClose={() => setEventDialogOpen(false)}
          academicCalendarId={selectedPeriod.id}
          defaultDate={newEventDate}
          event={editingEvent}
        />
      )}
    </div>
  );
}
