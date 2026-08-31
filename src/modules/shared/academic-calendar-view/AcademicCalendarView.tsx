"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import { Card, Badge, EmptyState, IconButton, SkeletonRows } from "@/components/ui";
import { getMonthGrid, monthLabel, toIsoDateString } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

const DOW_LABELS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

export interface AcademicCalendarEventLike {
  id: number | string;
  event_date: string; // "YYYY-MM-DD"
  title: string;
  description?: string | null;
  event_type: string;
}

function defaultEventTypeLabel(eventType: string): string {
  return eventType.charAt(0).toUpperCase() + eventType.slice(1);
}

export interface AcademicCalendarViewProps<E extends AcademicCalendarEventLike> {
  /** Defaults to "Academic Calendar". */
  title?: string;
  /** e.g. "Academic year 2026-27 · published by the office of academics". */
  subtitle?: ReactNode;
  /** Full or already month-scoped event list — filtered to viewYear/viewMonth internally either way. */
  events: E[];
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  viewYear: number;
  /** 0-indexed, matching `Date#getMonth()`. */
  viewMonth: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  /** Rendered top-right of the header, e.g. an "+ Add event" button for write-enabled callers. */
  headerAction?: ReactNode;
  /** Defaults to capitalizing the raw `event_type`. */
  eventTypeLabel?: (eventType: string) => string;
  /** Rendered after the type badge on each event row — e.g. Edit/Remove buttons. */
  renderEventActions?: (event: E) => ReactNode;
  /** Extra grid-cell highlighting beyond "has an event" — e.g. weekends. */
  isSpecialDay?: (date: Date) => boolean;
  /** Optional legend chips under the calendar grid. */
  legend?: { label: string; toneClassName: string }[];
  /** Defaults to "sunday", matching the majority of existing portals. */
  weekStart?: "sunday" | "monday";
  className?: string;
}

const WEEKDAY_LABELS_BY_START = {
  sunday: ["S", "M", "T", "W", "T", "F", "S"],
  monday: ["M", "T", "W", "T", "F", "S", "S"],
};

/**
 * The one shared "Academic Calendar" month view — a month-grid card plus a
 * matching event-list card, extracted from the HoD portal's implementation
 * (the cleanest of several near-duplicate copies across the app). Every
 * portal that displays the institution's real academic_calendar_events data
 * as a browsable month view should render through this component instead of
 * re-implementing the grid/list — see each portal's academic-calendar page
 * for how it wires its own data hook and (where applicable) write actions
 * into these props.
 *
 * Deliberately NOT used by pages that merge the shared calendar with a
 * genuinely different, role-specific data source as a second ingredient
 * (e.g. EDC's own events, media-room's shoot assignments, sports-admin's own
 * fixtures calendar) — those aren't duplicates of this feature, just callers
 * of the same underlying event data.
 */
export function AcademicCalendarView<E extends AcademicCalendarEventLike>({
  title = "Academic Calendar",
  subtitle,
  events,
  isLoading,
  isError,
  errorMessage = "Couldn't load the academic calendar — please try again.",
  viewYear,
  viewMonth,
  onPrevMonth,
  onNextMonth,
  headerAction,
  eventTypeLabel = defaultEventTypeLabel,
  renderEventActions,
  isSpecialDay,
  legend,
  weekStart = "sunday",
  className,
}: AcademicCalendarViewProps<E>) {
  // Callers' `event_date` isn't uniformly "YYYY-MM-DD" — some backends
  // return the full ISO datetime a Postgres `date` column serializes to
  // (e.g. "2026-08-20T00:00:00.000Z"). Slicing to the first 10 characters
  // is a no-op on an already-plain date and correctly normalizes the rest,
  // so every caller works regardless of which shape its endpoint returns.
  const dateOnly = (eventDate: string) => eventDate.slice(0, 10);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, E[]>();
    for (const e of events) {
      const key = dateOnly(e.event_date);
      const list = map.get(key) ?? [];
      list.push(e);
      map.set(key, list);
    }
    return map;
  }, [events]);

  const weeks = useMemo(() => getMonthGrid(viewYear, viewMonth, weekStart), [viewYear, viewMonth, weekStart]);
  const weekdayLabels = WEEKDAY_LABELS_BY_START[weekStart];
  const todayIso = toIsoDateString(new Date());

  const eventsInMonth = useMemo(
    () =>
      events
        .filter((e) => {
          const d = new Date(dateOnly(e.event_date) + "T00:00:00");
          return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
        })
        .sort((a, b) => dateOnly(a.event_date).localeCompare(dateOnly(b.event_date))),
    [events, viewYear, viewMonth],
  );

  return (
    <div className={cn("flex flex-col gap-5", className)}>
      {isError && (
        <div className="rounded-[11px] border border-danger-border bg-danger-bg px-4 py-2.5 text-[13px] font-semibold text-danger-fg">
          {errorMessage}
        </div>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">{title}</h1>
          {subtitle && <p className="mt-1 text-[13px] text-muted">{subtitle}</p>}
        </div>
        {headerAction}
      </div>

      <div className="grid grid-cols-[1.05fr_1fr] items-start gap-4">
        <Card className="hod-hover-card">
          <div className="mb-4 flex items-center justify-between gap-3">
            <IconButton icon="chevron_left" size={34} onClick={onPrevMonth} aria-label="Previous month" />
            <div className="text-center">
              <div className="text-[18px] font-extrabold tracking-[-.02em] text-ink">{monthLabel(viewYear, viewMonth)}</div>
              <div className="mt-0.5 text-[11.5px] font-semibold text-muted">
                {eventsInMonth.length} calendar event{eventsInMonth.length === 1 ? "" : "s"}
              </div>
            </div>
            <IconButton icon="chevron_right" size={34} onClick={onNextMonth} aria-label="Next month" />
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-center text-[12px] font-extrabold text-subtle">
            {weekdayLabels.map((d, i) => (
              <div key={i}>{d}</div>
            ))}
          </div>
          <div className="mt-1.5 grid grid-cols-7 gap-1.5">
            {weeks.flat().map((cell, i) => {
              if (!cell.iso) return <div key={i} className="h-12" />;
              const hasEvent = (eventsByDate.get(cell.iso) ?? []).length > 0;
              const special = !hasEvent && isSpecialDay?.(new Date(cell.iso + "T00:00:00"));
              const isToday = cell.iso === todayIso;
              return (
                <div
                  key={cell.iso}
                  className={cn(
                    "hod-hover-card flex h-12 items-center justify-center rounded-[10px] border text-[14px] font-bold",
                    hasEvent
                      ? "border-border-accent bg-accent-50 text-primary"
                      : special
                        ? "border-danger-border bg-danger-bg text-danger-fg"
                        : "border-border-default bg-surface text-ink",
                    isToday && "ring-2 ring-primary",
                  )}
                >
                  {cell.day}
                </div>
              );
            })}
          </div>

          {legend && legend.length > 0 && (
            <div className="mt-[18px] flex flex-wrap gap-4 border-t border-divider pt-[14px]">
              {legend.map((item) => (
                <span key={item.label} className="flex items-center gap-[7px] text-[12px] font-semibold text-body">
                  <span className={cn("size-[13px] rounded-[4px] border", item.toneClassName)} />
                  {item.label}
                </span>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="text-[16px] font-extrabold text-ink">Events in {monthLabel(viewYear, viewMonth).split(" ")[0]}</h2>
          {isLoading ? (
            <SkeletonRows count={4} className="mt-2" />
          ) : isError ? null : eventsInMonth.length === 0 ? (
            <EmptyState message="No calendar events recorded for this month." />
          ) : (
            <div className="mt-2 flex flex-col gap-2.5">
              {eventsInMonth.map((event) => {
                const d = new Date(dateOnly(event.event_date) + "T00:00:00");
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
                        {event.description ? ` · ${event.description}` : ""}
                      </div>
                    </div>
                    <Badge tone="accent">{eventTypeLabel(event.event_type)}</Badge>
                    {renderEventActions?.(event)}
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
