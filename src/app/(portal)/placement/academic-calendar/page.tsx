"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { PageHeader, Select, Card, SectionCard, PendingNotice, Badge } from "@/modules/admin/components/ui";
import { useBatches } from "@/modules/placement/api/refData";
import { useAcademicCalendarPeriods, useCalendarEvents, useCreateCalendarEvent } from "@/modules/placement/api/academicCalendar";
import { createPortal } from "react-dom";
import { ApiError } from "@/types/api";
import type { AcademicCalendarPeriod, CalendarEventItem, CalendarEventType } from "@/modules/placement/api/academicCalendar";

/**
 * Adds a placement event (drive date, pre-placement talk) to the selected
 * academic calendar.
 *
 * Placement may create events and edit or delete its own; the shared
 * institution entries — semester boundaries, exam dates — are protected
 * server-side, so this form cannot touch them.
 *
 * The backend requires both a start and an end time, so the form defaults them
 * to a working-hours slot rather than making the user fill them in for an
 * all-day entry.
 */
function AddCalendarEventModal({
  academicCalendarId,
  onClose,
}: {
  academicCalendarId: number;
  onClose: () => void;
}) {
  const createEvent = useCreateCalendarEvent();
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventType, setEventType] = useState<"event" | "holiday">("event");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!title.trim() || !eventDate) {
      setError("Give the event a title and a date.");
      return;
    }
    if (endTime <= startTime) {
      setError("End time must be after the start time.");
      return;
    }
    setError(null);
    try {
      await createEvent.mutateAsync({
        academic_calendar_id: academicCalendarId,
        title: title.trim(),
        event_date: eventDate,
        event_type: eventType,
        start_time: startTime,
        end_time: endTime,
        description: description.trim() || undefined,
      });
      onClose();
    } catch (err) {
      // The server rejects a date outside the calendar's own start/end range —
      // its wording is more useful than a generic failure.
      setError(err instanceof ApiError ? err.message : "Could not add this event.");
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-8">
      <div className="w-full max-w-[500px] rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-admin-border px-6 py-5">
          <div className="text-lg font-bold text-admin-ink">Add calendar event</div>
          <button type="button" onClick={onClose} className="flex size-8 items-center justify-center rounded-lg border border-admin-border text-admin-muted">
            ✕
          </button>
        </div>
        <div className="flex flex-col gap-4 px-6 py-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-admin-muted">Title</label>
            <input
              className="mt-1.5 w-full rounded-lg border border-admin-border px-3 py-2 text-sm"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. TCS pre-placement talk"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-admin-muted">Date</label>
              <input
                type="date"
                className="mt-1.5 w-full rounded-lg border border-admin-border px-3 py-2 text-sm"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-admin-muted">Type</label>
              <Select value={eventType} onChange={(e) => setEventType(e.target.value as "event" | "holiday")}>
                <option value="event">Event</option>
                <option value="holiday">Holiday</option>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-admin-muted">Start time</label>
              <input
                type="time"
                className="mt-1.5 w-full rounded-lg border border-admin-border px-3 py-2 text-sm"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-admin-muted">End time</label>
              <input
                type="time"
                className="mt-1.5 w-full rounded-lg border border-admin-border px-3 py-2 text-sm"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-admin-muted">Description</label>
            <input
              className="mt-1.5 w-full rounded-lg border border-admin-border px-3 py-2 text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          {error && <div className="text-sm font-semibold text-red-600">{error}</div>}
        </div>
        <div className="flex justify-end gap-2.5 border-t border-admin-border px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-lg border border-admin-border px-4 py-2 text-sm font-bold text-admin-ink">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={createEvent.isPending}
            className="rounded-lg bg-admin-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {createEvent.isPending ? "Adding…" : "Add event"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DOW = ["S", "M", "T", "W", "T", "F", "S"];
const DOW_FULL = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

const EVENT_TONE: Record<CalendarEventType, "neutral" | "success" | "warning" | "primary" | "danger"> = {
  holiday: "neutral",
  event: "success",
  instruction: "neutral",
  assessment: "warning",
  placement: "primary",
  institution: "danger",
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

/** Keyed by `period.id` on the caller side — that re-initializes `cursor` to the newly-selected period's start month instead of leaving the view stuck on whatever month the previous period showed. */
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
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <Card hoverable={false} className="p-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={goPrev}
            className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-admin-sm border border-admin-border bg-admin-tint text-admin-body hover:bg-admin-tint-strong"
            aria-label="Previous month"
          >
            <Icon name="chevron_left" size={18} />
          </button>
          <div className="flex-1 text-center">
            <div className="font-sans text-lg font-extrabold tracking-[-.01em] text-admin-ink">
              {MONTHS[cursor.month]} {cursor.year}
            </div>
            <div className="mt-0.5 text-[12.5px] text-admin-muted">
              {batchName} · Semester {period.semester} · {monthEvents.length} event{monthEvents.length === 1 ? "" : "s"}
            </div>
          </div>
          <button
            type="button"
            onClick={goNext}
            className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-admin-sm border border-admin-border bg-admin-tint text-admin-body hover:bg-admin-tint-strong"
            aria-label="Next month"
          >
            <Icon name="chevron_right" size={18} />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-2">
          {DOW.map((d, i) => (
            <div key={i} className="text-center text-xs font-bold text-admin-subtle">
              {d}
            </div>
          ))}
        </div>
        {/* Square cells, event state shown by fill and today by a ring — the
            same month-grid treatment the other modules use, rather than short
            rectangles with a marker dot. */}
        <div className="mt-2 grid grid-cols-7 gap-1.5">
          {cells.map((c, i) => {
            const hasEvents = c.events.length > 0;
            return (
              <div
                key={i}
                title={hasEvents ? c.events.map((e) => e.title).join(", ") : undefined}
                className={`flex aspect-square items-center justify-center rounded-admin-sm text-[13px] ${
                  !c.inMonth
                    ? "text-admin-border-hover"
                    : hasEvents
                      ? "bg-admin-tint-strong font-bold text-admin-primary"
                      : "font-medium text-admin-ink"
                } ${c.isToday ? "ring-2 ring-admin-primary" : ""}`}
              >
                {c.day ?? ""}
              </div>
            );
          })}
        </div>
      </Card>

      <Card hoverable={false} className="p-5">
        <div className="font-sans text-base font-extrabold tracking-[-.01em] text-admin-ink">Events in {MONTHS[cursor.month]}</div>
        <div className="mt-2 flex flex-col">
          {events.isLoading && <div className="py-3 text-sm text-admin-muted">Loading…</div>}
          {!events.isLoading && monthEvents.length === 0 && <div className="py-3 text-sm text-admin-muted">No events published this month.</div>}
          {monthEvents.map((e) => {
            const p = dateParts(e.eventDate);
            const dow = DOW_FULL[new Date(Date.UTC(p.year, p.month, p.day)).getUTCDay()];
            return (
              <div key={e.id} className="flex items-center gap-3.5 border-t border-admin-divider py-3 first:border-t-0">
                <div className="flex size-12 shrink-0 flex-col items-center justify-center rounded-admin-sm bg-admin-tint leading-tight">
                  <span className="text-[15px] font-bold text-admin-ink">{p.day}</span>
                  <span className="text-[9.5px] tracking-wide text-admin-muted">{dow}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold tracking-[-.01em] text-admin-ink">{e.title}</div>
                  <div className="mt-0.5 text-xs text-admin-muted">
                    {e.startTime ? `${e.startTime}–${e.endTime ?? ""}` : "All day"}
                    {e.description ? ` · ${e.description}` : ""}
                  </div>
                </div>
                <Badge tone={EVENT_TONE[e.eventType] ?? "neutral"}>{e.eventType}</Badge>
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
    () => (periods.data ?? []).filter((p) => (batchId === "all" || p.batchId === batchId) && (semester === "all" || p.semester === semester)),
    [periods.data, batchId, semester],
  );

  const semesterOptions = useMemo(() => {
    const set = new Set((periods.data ?? []).filter((p) => batchId === "all" || p.batchId === batchId).map((p) => p.semester));
    return Array.from(set).sort((a, b) => a - b);
  }, [periods.data, batchId]);

  // Defaults to the most recently-ended period in the filtered set — the
  // current/latest real term — rather than whichever row the backend
  // happens to return first.
  const [showAddEvent, setShowAddEvent] = useState(false);

  const selectedPeriod = useMemo(
    () => (filteredPeriods.length === 0 ? null : filteredPeriods.reduce((latest, p) => (p.endDate > latest.endDate ? p : latest), filteredPeriods[0])),
    [filteredPeriods],
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Academic Calendar"
        description="Institution events, plus the placement dates this cell adds. Shared entries stay owned by the Academic Coordinator and Principal."
        actions={
          <>
            {selectedPeriod && (
              <button
                type="button"
                onClick={() => setShowAddEvent(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-admin-primary px-4 py-2 text-sm font-bold text-white"
              >
                <Icon name="add" size={16} /> Add event
              </button>
            )}
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
          </>
        }
      />

      {periods.isLoading ? (
        <PendingNotice reason="Loading calendar…" height={140} />
      ) : !selectedPeriod ? (
        <SectionCard title="No calendar published">
          <p className="text-sm text-admin-muted">No academic calendar published for this batch/semester yet.</p>
        </SectionCard>
      ) : (
        <CalendarPeriodView key={selectedPeriod.id} period={selectedPeriod} batchName={batchNameById.get(selectedPeriod.batchId) ?? `Batch #${selectedPeriod.batchId}`} />
      )}

      {showAddEvent && selectedPeriod && (
        <AddCalendarEventModal academicCalendarId={selectedPeriod.id} onClose={() => setShowAddEvent(false)} />
      )}
    </div>
  );
}
