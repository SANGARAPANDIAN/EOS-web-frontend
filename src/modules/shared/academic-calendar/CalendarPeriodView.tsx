"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useCalendarEvents } from "./api";
import type { AcademicCalendarPeriod, CalendarEventItem, CalendarEventType } from "./types";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DOW = ["S", "M", "T", "W", "T", "F", "S"];
const DOW_FULL = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

const EVENT_TONE: Record<CalendarEventType, "accent" | "neutral"> = {
  holiday: "neutral",
  event: "accent",
};

// event_date arrives as an ISO date string at UTC midnight — parsing its
// Y/M/D via the UTC getters (not the local getters) avoids the date
// shifting a day back for any viewer west of UTC.
export function dateParts(iso: string) {
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

export function buildMonthCells(year: number, month: number, events: CalendarEventItem[]): CalCell[] {
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

interface CalendarPeriodViewProps {
  period: AcademicCalendarPeriod;
  batchName: string;
  /** Omit for a pure read-only view — this is what makes HOD/Faculty/Student style pages differ from Coordinator/Principal/Placement/Secretary. */
  onAddEvent?: (date: string) => void;
  /** Called only for events the caller has decided are editable (e.g. own-events-only roles pre-filter by createdByUserId). */
  onEditEvent?: (event: CalendarEventItem) => void;
  headerActions?: React.ReactNode;
  /** Extra controls rendered under the month header, above the grid — e.g. Academic Coordinator's "Edit period" button, which no other role has. */
  periodActions?: React.ReactNode;
}

/** Shared month-grid + event-list — the one calendar view every write-capable role (Academic Coordinator, Principal, Secretary, Media Room, Placement) composes, instead of each maintaining its own near-identical copy. */
export function CalendarPeriodView({ period, batchName, onAddEvent, onEditEvent, headerActions, periodActions }: CalendarPeriodViewProps) {
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
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <Card className="p-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={goPrev}
            className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg border border-border-default bg-surface-tint text-body hover:bg-accent-100"
            aria-label="Previous month"
          >
            <Icon name="chevron_left" size={18} />
          </button>
          <div className="flex-1 text-center">
            <div className="font-sans text-lg font-extrabold tracking-[-.01em] text-ink">
              {MONTHS[cursor.month]} {cursor.year}
            </div>
            <div className="mt-0.5 text-[12.5px] text-muted">
              {batchName} · Semester {period.semester} · {monthEvents.length} event{monthEvents.length === 1 ? "" : "s"}
            </div>
          </div>
          <button
            type="button"
            onClick={goNext}
            className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg border border-border-default bg-surface-tint text-body hover:bg-accent-100"
            aria-label="Next month"
          >
            <Icon name="chevron_right" size={18} />
          </button>
        </div>

        {periodActions && <div className="mt-3 flex gap-2">{periodActions}</div>}

        <div className="mt-4 grid grid-cols-7 gap-2">
          {DOW.map((d, i) => (
            <div key={i} className="text-center text-xs font-bold text-subtle">
              {d}
            </div>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-7 gap-1.5">
          {cells.map((c, i) => {
            const hasEvents = c.events.length > 0;
            return (
              <div
                key={i}
                title={hasEvents ? c.events.map((e) => e.title).join(", ") : c.iso && onAddEvent ? "Add an event" : undefined}
                onClick={() => {
                  if (!c.iso || !onAddEvent) return;
                  if (c.events.length === 1 && onEditEvent) onEditEvent(c.events[0]);
                  else if (c.events.length === 0) onAddEvent(c.iso);
                }}
                className={`flex aspect-square items-center justify-center rounded-lg text-[13px] ${
                  !c.inMonth
                    ? "text-subtle"
                    : hasEvents
                      ? "bg-accent-100 font-bold text-primary"
                      : "font-medium text-ink"
                } ${c.isToday ? "ring-2 ring-primary" : ""} ${c.iso && onAddEvent ? "cursor-pointer hover:border-border-default" : ""}`}
              >
                {c.day ?? ""}
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div className="font-sans text-base font-extrabold tracking-[-.01em] text-ink">Events in {MONTHS[cursor.month]}</div>
          {headerActions ?? (onAddEvent && (
            <button
              type="button"
              onClick={() => onAddEvent(`${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}-01`)}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white"
            >
              + Add event
            </button>
          ))}
        </div>
        <div className="mt-2 flex flex-col">
          {events.isLoading && <div className="py-3 text-sm text-muted">Loading…</div>}
          {!events.isLoading && monthEvents.length === 0 && <div className="py-3 text-sm text-muted">No events published this month.</div>}
          {monthEvents.map((e) => {
            const p = dateParts(e.eventDate);
            const dow = DOW_FULL[new Date(Date.UTC(p.year, p.month, p.day)).getUTCDay()];
            const editable = onEditEvent != null;
            const Tag = editable ? "button" : "div";
            return (
              <Tag
                key={e.id}
                type={editable ? "button" : undefined}
                onClick={editable ? () => onEditEvent!(e) : undefined}
                className={`flex items-center gap-3.5 border-t border-divider py-3 text-left first:border-t-0 ${editable ? "cursor-pointer hover:bg-surface-tint" : ""}`}
              >
                <div className="flex size-12 shrink-0 flex-col items-center justify-center rounded-lg bg-surface-tint leading-tight">
                  <span className="text-[15px] font-bold text-ink">{p.day}</span>
                  <span className="text-[9.5px] tracking-wide text-muted">{dow}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold tracking-[-.01em] text-ink">{e.title}</div>
                  <div className="mt-0.5 text-xs text-muted">
                    {e.startTime ? `${e.startTime}–${e.endTime ?? ""}` : "All day"}
                    {e.description ? ` · ${e.description}` : ""}
                  </div>
                </div>
                <Badge tone={EVENT_TONE[e.eventType] ?? "neutral"}>{e.eventType}</Badge>
              </Tag>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
