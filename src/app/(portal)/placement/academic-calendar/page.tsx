"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { useBatches } from "@/modules/placement/hooks/useBatches";
import { useAcademicCalendarPeriods, useCalendarEvents } from "@/modules/placement/hooks/useAcademicCalendar";
import type { AcademicCalendarPeriod, CalendarEventItem, CalendarEventType } from "@/modules/placement/types";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DOW = ["S", "M", "T", "W", "T", "F", "S"];
const DOW_FULL = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

const EVENT_TONE: Record<CalendarEventType, { bg: string; fg: string }> = {
  holiday: { bg: "#eef1f6", fg: "#16224a" },
  event: { bg: "#e6f6ec", fg: "#1a7a44" },
  instruction: { bg: "#eff2f7", fg: "#46536a" },
  assessment: { bg: "#fdf1e0", fg: "#93650e" },
  placement: { bg: "#e8f0fe", fg: "#1d4ed8" },
  institution: { bg: "#f1e9fb", fg: "#5b2e9c" },
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
  for (let i = 0; i < firstDow; i++) cells.push({ day: null, inMonth: false, isToday: false, events: [] });
  for (let day = 1; day <= daysInMonth; day++) {
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({ day, inMonth: true, isToday: iso === todayIso, events: byDay.get(day) ?? [] });
  }
  while (cells.length % 7 !== 0) cells.push({ day: null, inMonth: false, isToday: false, events: [] });
  return cells;
}

/**
 * Keyed by `period.id` on the caller side — that's what re-initializes
 * `cursor` to the newly-selected period's start month instead of leaving
 * the view stuck on whatever month the previous period was showing.
 */
function CalendarPeriodView({ period, batchName }: { period: AcademicCalendarPeriod; batchName: string }) {
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
      <Card className="p-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={goPrev}
            className="size-[38px] rounded-[9px] border border-border-default bg-surface-tint text-[15px] text-body"
          >
            ‹
          </button>
          <div className="flex-1 text-center">
            <div className="text-[19px] font-bold tracking-[-.4px] text-ink">
              {MONTHS[cursor.month]} {cursor.year}
            </div>
            <div className="mt-0.5 text-[12.5px] text-muted">
              {batchName} · Semester {period.semester} · {monthEvents.length} event{monthEvents.length === 1 ? "" : "s"}
            </div>
          </div>
          <button
            type="button"
            onClick={goNext}
            className="size-[38px] rounded-[9px] border border-border-default bg-surface-tint text-[15px] text-body"
          >
            ›
          </button>
        </div>

        <div className="mt-4.5 grid grid-cols-7 gap-2">
          {DOW.map((d, i) => (
            <div key={i} className="text-center text-xs font-bold text-subtle">
              {d}
            </div>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-7 gap-2">
          {cells.map((c, i) => (
            <div
              key={i}
              title={c.events.map((e) => e.title).join(", ")}
              className={`flex min-h-[46px] flex-col items-center gap-[3px] rounded-[8px] px-1 py-1.5 text-[12.5px] ${
                c.inMonth ? "text-body" : "text-subtle"
              } ${c.isToday ? "border border-primary bg-accent-100" : c.events.length > 0 ? "border border-transparent bg-surface-tint" : "border border-transparent"}`}
            >
              <span className={c.isToday ? "font-bold" : "font-medium"}>{c.day ?? ""}</span>
              {c.events.length > 0 && (
                <span
                  className="size-[5px] rounded-full"
                  style={{ background: EVENT_TONE[c.events[0].eventType]?.fg ?? "#1d4ed8" }}
                />
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <div className="text-[17px] font-bold tracking-[-.3px] text-ink">Events in {MONTHS[cursor.month]}</div>
        <div className="mt-2 flex flex-col">
          {events.isLoading && <div className="px-0.5 py-[13px] text-[13px] text-muted">Loading…</div>}
          {!events.isLoading && monthEvents.length === 0 && (
            <div className="px-0.5 py-[13px] text-[13px] text-muted">No events published this month.</div>
          )}
          {monthEvents.map((e) => {
            const p = dateParts(e.eventDate);
            const dow = DOW_FULL[new Date(Date.UTC(p.year, p.month, p.day)).getUTCDay()];
            const tone = EVENT_TONE[e.eventType] ?? EVENT_TONE.event;
            return (
              <div key={e.id} className="flex items-center gap-3.5 border-t border-divider px-0.5 py-[13px]">
                <div className="flex size-12 shrink-0 flex-col items-center justify-center rounded-[10px] bg-surface-tint leading-[1.1]">
                  <span className="text-[15px] font-bold">{p.day}</span>
                  <span className="text-[9.5px] tracking-[.6px] text-subtle">{dow}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold tracking-[-.2px] text-ink">{e.title}</div>
                  <div className="mt-[3px] text-[12.5px] text-muted">
                    {e.startTime ? `${e.startTime}–${e.endTime ?? ""}` : "All day"}
                    {e.description ? ` · ${e.description}` : ""}
                  </div>
                </div>
                <span
                  className="shrink-0 rounded-[6px] px-2 py-[3px] font-mono text-[10px] font-semibold tracking-[.7px] uppercase"
                  style={{ background: tone.bg, color: tone.fg }}
                >
                  {e.eventType}
                </span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

export default function PlacementAcademicCalendarPage() {
  const batches = useBatches();
  const periods = useAcademicCalendarPeriods();

  const [batchId, setBatchId] = useState<number | "all">("all");
  const [semester, setSemester] = useState<number | "all">("all");

  const batchNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const b of batches.data ?? []) map.set(b.id, b.name);
    return map;
  }, [batches.data]);

  const filteredPeriods = useMemo(
    () =>
      (periods.data ?? []).filter(
        (p) => (batchId === "all" || p.batchId === batchId) && (semester === "all" || p.semester === semester),
      ),
    [periods.data, batchId, semester],
  );

  const semesterOptions = useMemo(() => {
    const set = new Set((periods.data ?? []).filter((p) => batchId === "all" || p.batchId === batchId).map((p) => p.semester));
    return Array.from(set).sort((a, b) => a - b);
  }, [periods.data, batchId]);

  // Defaults to the most recently-ended period in the filtered set — the
  // current/latest real term — rather than whichever row the backend
  // happens to return first.
  const selectedPeriod = useMemo(
    () =>
      filteredPeriods.length === 0
        ? null
        : filteredPeriods.reduce((latest, p) => (p.endDate > latest.endDate ? p : latest), filteredPeriods[0]),
    [filteredPeriods],
  );

  return (
    <div className="flex flex-col gap-4.5">
      <div className="flex flex-wrap items-end gap-5">
        <div className="min-w-70 flex-1">
          <h1 className="m-0 text-[26px] font-bold tracking-[-.02em] text-ink">Academic Calendar</h1>
          <p className="mt-1.5 text-[13px] text-muted">
            Published institution events — read-only here; Academic Coordinator and Principal add or edit events.
          </p>
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
        </div>
      </div>

      {periods.isLoading ? (
        <div className="text-[13px] text-muted">Loading calendar…</div>
      ) : !selectedPeriod ? (
        <div className="text-[13px] text-muted">No academic calendar published for this batch/semester yet.</div>
      ) : (
        <CalendarPeriodView
          key={selectedPeriod.id}
          period={selectedPeriod}
          batchName={batchNameById.get(selectedPeriod.batchId) ?? `Batch #${selectedPeriod.batchId}`}
        />
      )}
    </div>
  );
}
