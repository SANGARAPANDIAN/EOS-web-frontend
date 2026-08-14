"use client";

import { useMemo, useState } from "react";
import { Card, Badge, EmptyState, IconButton } from "@/components/ui";
import { useMyAcademicCalendar } from "@/modules/student/api/profile";
import type { AcademicCalendarEvent } from "@/modules/student/api/profile";
import { getMonthGrid, monthLabel, academicYearLabel } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const DOW_LABELS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

// The real schema only distinguishes `holiday` vs a generic `event` — the
// design reference's richer Examination/Placement/Institution/Finance tags
// have no backing column anywhere (calendar_event_type_enum is holiday|event
// only), so this sticks to the two real values rather than guessing a
// category from free-text titles.
const EVENT_TYPE_LABEL: Record<string, string> = {
  holiday: "Holiday",
  event: "Instruction",
};

export default function AcademicCalendarPage() {
  const academicCalendar = useMyAcademicCalendar();
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const eventsByDate = useMemo(() => {
    const events = academicCalendar.data?.events ?? [];
    const map = new Map<string, AcademicCalendarEvent[]>();
    for (const e of events) {
      const list = map.get(e.event_date) ?? [];
      list.push(e);
      map.set(e.event_date, list);
    }
    return map;
  }, [academicCalendar.data]);

  const weeks = useMemo(() => getMonthGrid(viewYear, viewMonth, "sunday"), [viewYear, viewMonth]);

  const eventsInMonth = useMemo(() => {
    const events = academicCalendar.data?.events ?? [];
    return events
      .filter((e) => {
        const d = new Date(e.event_date);
        return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
      })
      .sort((a, b) => a.event_date.localeCompare(b.event_date));
  }, [academicCalendar.data, viewYear, viewMonth]);

  const yearLabel = academicYearLabel(academicCalendar.data?.start_date ?? null, academicCalendar.data?.semester);

  return (
    <div className="flex flex-col gap-[18px] animate-pop-in">
      <div>
        <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">Academic calendar</h1>
        <p className="mt-1 text-[13.5px] text-muted">
          {yearLabel ? `Academic year ${yearLabel} · ` : ""}published by the office of academics
        </p>
      </div>

      <div className="grid grid-cols-[1.05fr_1fr] items-start gap-4">
        <Card>
          <div className="mb-4 flex items-center justify-between gap-3">
            <IconButton
              icon="chevron_left"
              size={34}
              onClick={() => {
                const d = new Date(viewYear, viewMonth - 1, 1);
                setViewYear(d.getFullYear());
                setViewMonth(d.getMonth());
              }}
            />
            <div className="text-center">
              <div className="text-[16px] font-extrabold tracking-[-.02em] text-ink">{monthLabel(viewYear, viewMonth)}</div>
              <div className="mt-0.5 text-[11.5px] font-semibold text-muted">
                {eventsInMonth.length} calendar event{eventsInMonth.length === 1 ? "" : "s"}
              </div>
            </div>
            <IconButton
              icon="chevron_right"
              size={34}
              onClick={() => {
                const d = new Date(viewYear, viewMonth + 1, 1);
                setViewYear(d.getFullYear());
                setViewMonth(d.getMonth());
              }}
            />
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-extrabold text-subtle">
            {WEEKDAY_LABELS.map((d, i) => (
              <div key={i}>{d}</div>
            ))}
          </div>
          <div className="mt-1.5 grid grid-cols-7 gap-1.5">
            {weeks.flat().map((cell, i) => {
              if (!cell.iso) return <div key={i} className="h-11" />;
              const dayEvents = eventsByDate.get(cell.iso) ?? [];
              const hasEvent = dayEvents.length > 0;
              const isSunday = new Date(cell.iso + "T00:00:00").getDay() === 0;
              return (
                <div
                  key={cell.iso}
                  className={cn(
                    "flex h-11 flex-col items-center justify-center gap-0.5 rounded-[10px] border text-[13px] font-bold",
                    hasEvent
                      ? "border-border-accent bg-accent-50 text-primary"
                      : isSunday
                        ? "border-surface-input bg-surface-input text-faint"
                        : "border-surface-tint bg-surface text-ink",
                  )}
                >
                  <span>{cell.day}</span>
                </div>
              );
            })}
          </div>

          <div className="mt-[18px] flex flex-wrap gap-4 border-t border-divider pt-[14px]">
            {["Holiday", "Instruction"].map((label) => (
              <span key={label} className="flex items-center gap-[7px] text-[12px] font-semibold text-body">
                <span className="size-[13px] rounded-[4px] border border-border-accent bg-accent-50" />
                {label}
              </span>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-[15px] font-extrabold tracking-[-.02em] text-ink">Events in {monthLabel(viewYear, viewMonth).split(" ")[0]}</h2>
          {academicCalendar.isLoading ? (
            <EmptyState message="Loading…" />
          ) : eventsInMonth.length === 0 ? (
            <EmptyState message="No calendar events recorded for this month." />
          ) : (
            <div className="mt-2 flex flex-col">
              {eventsInMonth.map((event) => {
                const d = new Date(event.event_date + "T00:00:00");
                return (
                  <div key={event.id} className="flex items-start gap-3.5 border-t border-divider py-[13px] first:border-0 first:pt-0">
                    <div className="flex w-[52px] shrink-0 flex-col items-center rounded-[9px] border border-border-default bg-surface-input py-1.5">
                      <span className="text-[14px] font-extrabold leading-none text-ink">{d.getDate()}</span>
                      <span className="text-[9.5px] font-bold tracking-[.06em] text-muted">{DOW_LABELS[d.getDay()]}</span>
                    </div>
                    <div className="flex-1">
                      <div className="text-[13.5px] font-bold leading-[1.35] text-ink">{event.title}</div>
                      <div className="mt-0.5 text-[12px] text-muted">
                        {d.toLocaleDateString("en-IN", { month: "long", day: "numeric", year: "numeric" })}
                      </div>
                    </div>
                    <Badge tone="accent">{EVENT_TYPE_LABEL[event.event_type] ?? event.event_type}</Badge>
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
