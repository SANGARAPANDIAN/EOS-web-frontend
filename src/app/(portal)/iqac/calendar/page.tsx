"use client";

import { useMemo, useState } from "react";
import { Card, Badge, EmptyState, IconButton, SkeletonRows, type BadgeTone } from "@/components/ui";
import type { CalendarEventType } from "@/modules/iqac/api/calendarEvents";
import { useIqacCalendarEvents } from "@/modules/iqac/api/iqacCalendar";
import { getMonthGrid, monthLabel, toIsoDateString } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const DOW_LABELS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

const TYPE_TONE: Record<CalendarEventType, BadgeTone> = {
  event: "accent",
  institution: "accent",
  placement: "accent",
  holiday: "neutral",
  instruction: "neutral",
  assessment: "neutral",
};

const TYPE_LABEL: Record<CalendarEventType, string> = {
  event: "Event",
  institution: "Institution",
  placement: "Placement",
  holiday: "Holiday",
  instruction: "Instruction",
  assessment: "Assessment",
};

export default function IqacCalendarPage() {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth()); // 0-indexed
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const calendar = useIqacCalendarEvents();

  const events = useMemo(() => calendar.data ?? [], [calendar.data]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, true>();
    for (const ev of events) map.set(ev.event_date.slice(0, 10), true);
    return map;
  }, [events]);

  const weeks = useMemo(() => getMonthGrid(viewYear, viewMonth, "sunday"), [viewYear, viewMonth]);

  const monthEvents = useMemo(
    () =>
      events
        .filter((ev) => {
          const d = new Date(ev.event_date);
          return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
        })
        .sort((a, b) => a.event_date.localeCompare(b.event_date)),
    [events, viewYear, viewMonth],
  );

  const shownEvents = useMemo(
    () => (selectedDay == null ? monthEvents : monthEvents.filter((ev) => new Date(ev.event_date).getDate() === selectedDay)),
    [monthEvents, selectedDay],
  );

  function shiftMonth(delta: number) {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    setSelectedDay(null);
  }

  const todayIso = toIsoDateString(new Date());

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div>
        <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Academic calendar</h1>
        <p className="mt-1 text-[13px] text-muted">
          Institution events on the real academic calendar, enriched with each event's real batch/semester. Read-only — Academic Coordinator/Principal/Secretary own scheduling.
        </p>
      </div>

      <div className="grid grid-cols-[1.05fr_1fr] items-start gap-4">
        <Card className="hover-lift">
          <div className="mb-4 flex items-center justify-between gap-3">
            <IconButton icon="chevron_left" size={34} onClick={() => shiftMonth(-1)} />
            <div className="text-center">
              <div className="text-[18px] font-extrabold tracking-[-.02em] text-ink">{monthLabel(viewYear, viewMonth)}</div>
              <div className="mt-0.5 text-[11.5px] font-semibold text-muted">
                {monthEvents.length} calendar event{monthEvents.length === 1 ? "" : "s"}
              </div>
            </div>
            <IconButton icon="chevron_right" size={34} onClick={() => shiftMonth(1)} />
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-center text-[12px] font-extrabold text-subtle">
            {WEEKDAY_LABELS.map((d, i) => (
              <div key={i}>{d}</div>
            ))}
          </div>
          <div className="mt-1.5 grid grid-cols-7 gap-1.5">
            {weeks.flat().map((cell, i) => {
              if (!cell.iso || !cell.day) return <div key={i} className="h-12" />;
              const hasEvent = eventsByDate.has(cell.iso);
              const isToday = cell.iso === todayIso;
              const isSelected = selectedDay === cell.day;
              return (
                <button
                  key={cell.iso}
                  type="button"
                  onClick={() => setSelectedDay((d) => (d === cell.day ? null : cell.day))}
                  className={cn(
                    "hover-lift flex h-12 items-center justify-center rounded-[10px] border text-[14px] font-bold",
                    isSelected
                      ? "border-primary bg-accent-50 text-primary"
                      : hasEvent
                        ? "border-border-accent bg-accent-50 text-primary"
                        : "border-border-default bg-surface text-ink",
                    isToday && !isSelected && "ring-2 ring-primary",
                  )}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>
        </Card>

        <Card>
          <h2 className="text-[16px] font-extrabold text-ink">
            {selectedDay == null ? `Events in ${monthLabel(viewYear, viewMonth).split(" ")[0]}` : `Events on ${monthLabel(viewYear, viewMonth).split(" ")[0]} ${selectedDay}`}
          </h2>
          {calendar.isLoading ? (
            <SkeletonRows count={4} className="mt-2" />
          ) : shownEvents.length === 0 ? (
            <EmptyState message={selectedDay == null ? "No calendar events recorded for this month." : "No events on this date."} />
          ) : (
            <div className="mt-2 flex flex-col gap-2.5">
              {shownEvents.map((ev) => {
                const d = new Date(`${ev.event_date.slice(0, 10)}T00:00:00`);
                return (
                  <div key={ev.id} className="hover-lift flex items-center gap-3.5 rounded-[11px] border border-border-default px-3.5 py-3">
                    <div className="flex w-[52px] shrink-0 flex-col items-center rounded-[9px] border border-border-default bg-surface-input py-1.5">
                      <span className="text-[14px] font-extrabold leading-none text-ink">{d.getDate()}</span>
                      <span className="text-[9.5px] font-bold tracking-[.06em] text-muted">{DOW_LABELS[d.getDay()]}</span>
                    </div>
                    <div className="flex-1">
                      <div className="text-[13.5px] font-bold leading-[1.35] text-ink">{ev.title}</div>
                      <div className="mt-0.5 text-[12px] text-muted">
                        {d.toLocaleDateString("en-IN", { month: "long", day: "numeric", year: "numeric" })} · {ev.batch_label} · Sem {ev.semester}
                      </div>
                    </div>
                    <Badge tone={TYPE_TONE[ev.event_type]}>{TYPE_LABEL[ev.event_type]}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
