"use client";

import { useMemo, useState } from "react";
import { Card, Badge, EmptyState, IconButton, SkeletonRows } from "@/components/ui";
import { useHodAcademicCalendarMonth, type HodCalendarEvent } from "@/modules/hod/api/academicCalendar";
import { getMonthGrid, monthLabel } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const DOW_LABELS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

// The real schema only distinguishes `holiday` vs a generic `event`
// (calendar_event_type_enum) — the design reference's richer Instruction/
// Assessment/Placement/Institution categories have no backing enum value
// yet. Every category in the reference renders with the exact same chip
// style (verified directly from HOD Portal.dc.html), so this renders
// whatever event_type string the database has, capitalized, with no
// per-category color logic — it'll pick up new categories automatically
// once/if the enum is extended (see the SQL handoff).
function categoryLabel(eventType: string): string {
  return eventType.charAt(0).toUpperCase() + eventType.slice(1);
}

export default function HodAcademicCalendarPage() {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth()); // 0-indexed
  const calendar = useHodAcademicCalendarMonth(viewYear, viewMonth + 1);

  const eventsByDate = useMemo(() => {
    const events = calendar.data?.events ?? [];
    const map = new Map<string, HodCalendarEvent[]>();
    for (const e of events) {
      const list = map.get(e.event_date) ?? [];
      list.push(e);
      map.set(e.event_date, list);
    }
    return map;
  }, [calendar.data]);

  const weeks = useMemo(() => getMonthGrid(viewYear, viewMonth, "sunday"), [viewYear, viewMonth]);
  const events = calendar.data?.events ?? [];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      {calendar.isError && (
        <div className="rounded-[11px] border border-danger-border bg-danger-bg px-4 py-2.5 text-[13px] font-semibold text-danger-fg">
          Couldn&apos;t load the academic calendar — please try again.
        </div>
      )}
      <div>
        <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-[#080000]">Academic Calendar</h1>
        <p className="mt-1 text-[13px] text-muted">
          Academic year {viewYear}-{String(viewYear + 1).slice(2)} · published by the office of academics
        </p>
      </div>

      <div className="grid grid-cols-[1.05fr_1fr] items-start gap-4">
        <Card className="hod-hover-card">
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
              <div className="text-[18px] font-extrabold tracking-[-.02em] text-ink">{monthLabel(viewYear, viewMonth)}</div>
              <div className="mt-0.5 text-[11.5px] font-semibold text-muted">
                {events.length} calendar event{events.length === 1 ? "" : "s"}
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

          <div className="grid grid-cols-7 gap-1.5 text-center text-[12px] font-extrabold text-subtle">
            {WEEKDAY_LABELS.map((d, i) => (
              <div key={i}>{d}</div>
            ))}
          </div>
          <div className="mt-1.5 grid grid-cols-7 gap-1.5">
            {weeks.flat().map((cell, i) => {
              if (!cell.iso) return <div key={i} className="h-12" />;
              const hasEvent = (eventsByDate.get(cell.iso) ?? []).length > 0;
              return (
                <div
                  key={cell.iso}
                  className={cn(
                    "hod-hover-card flex h-12 items-center justify-center rounded-[10px] border text-[14px] font-bold",
                    hasEvent
                      ? "border-border-accent bg-accent-50 text-primary"
                      : "border-border-default bg-surface text-ink",
                  )}
                >
                  {cell.day}
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <h2 className="text-[16px] font-extrabold text-ink">Events in {monthLabel(viewYear, viewMonth).split(" ")[0]}</h2>
          {calendar.isLoading ? (
            <SkeletonRows count={4} className="mt-2" />
          ) : calendar.isError ? null : events.length === 0 ? (
            <EmptyState message="No calendar events recorded for this month." />
          ) : (
            <div className="mt-2 flex flex-col gap-2.5">
              {events.map((event) => {
                const d = new Date(event.event_date + "T00:00:00");
                return (
                  <div
                    key={event.id}
                    className="hod-hover-row flex items-center gap-3.5 rounded-[11px] border border-border-default px-3.5 py-3"
                  >
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
                    <Badge tone="accent">{categoryLabel(event.event_type)}</Badge>
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
