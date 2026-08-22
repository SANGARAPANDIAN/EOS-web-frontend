"use client";

import { useMemo, useState } from "react";
import { Badge, Button, EmptyState, Select, type BadgeTone } from "@/components/ui";
import { useAcademicCalendarEvents, type CalendarEvent, type CalendarEventType } from "@/modules/media-room/api/calendarEvents";
import { useShootAssignments, useCreateShootAssignment } from "@/modules/media-room/api/shoots";
import { useTeamMembers } from "@/modules/media-room/api/team";
import { getMonthGrid, monthLabel, toIsoDateString } from "@/lib/utils/date";

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

const COVERAGE_TYPES = ["Photo + video", "Photo only", "Reel / short", "Live stream"];

interface MergedEvent {
  key: string;
  date: string;
  title: string;
  meta: string;
  tag: string;
  tone: BadgeTone;
}

function AddMediaEventForm({ onClose }: { onClose: () => void }) {
  const team = useTeamMembers();
  const create = useCreateShootAssignment();

  const [eventTitle, setEventTitle] = useState("");
  const [date, setDate] = useState("");
  const [callTime, setCallTime] = useState("");
  const [coverageType, setCoverageType] = useState(COVERAGE_TYPES[0]);
  const [crew, setCrew] = useState("Full team");
  const [venue, setVenue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const members = team.data?.ready ? team.data.data : [];
  const crewOptions = ["Full team", ...members.map((m) => m.full_name)];

  async function submit() {
    if (!eventTitle.trim() || !date) {
      setError("Event title and date are required.");
      return;
    }
    setError(null);
    try {
      await create.mutateAsync({
        event_title: eventTitle.trim(),
        venue: venue.trim() || undefined,
        scheduled_at: new Date(`${date}T${callTime || "00:00"}:00`).toISOString(),
        output_type: coverageType,
        crew,
      });
      onClose();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Could not add this media event.");
    }
  }

  return (
    <div data-mr-lift="1" className="rounded-card border border-border-default bg-surface p-[24px_26px]">
      <div className="text-[19px] font-extrabold tracking-[-.01em] text-ink">New media event</div>
      <div className="mt-[18px] grid grid-cols-[2fr_1fr_1fr] gap-4">
        <div>
          <label className="text-[15.5px] font-bold text-primary">Event title</label>
          <input
            placeholder="e.g. Independence Day flag hoisting"
            value={eventTitle}
            onChange={(e) => setEventTitle(e.target.value)}
            className="mt-2.5 h-12 w-full rounded-[12px] border border-border-default px-3.5 text-[16.5px] outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="text-[15.5px] font-bold text-primary">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-2.5 h-12 w-full rounded-[12px] border border-border-default px-3.5 text-[16.5px] outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="text-[15.5px] font-bold text-primary">Call time</label>
          <input
            type="time"
            value={callTime}
            onChange={(e) => setCallTime(e.target.value)}
            className="mt-2.5 h-12 w-full rounded-[12px] border border-border-default px-3.5 text-[16.5px] outline-none focus:border-primary"
          />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-4">
        <div>
          <label className="text-[15.5px] font-bold text-primary">Coverage type</label>
          <Select className="mt-2.5 h-12" value={coverageType} onChange={(e) => setCoverageType(e.target.value)}>
            {COVERAGE_TYPES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="text-[15.5px] font-bold text-primary">Crew</label>
          <Select className="mt-2.5 h-12" value={crew} onChange={(e) => setCrew(e.target.value)}>
            {crewOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="text-[15.5px] font-bold text-primary">Venue</label>
          <input
            placeholder="e.g. Main quadrangle"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            className="mt-2.5 h-12 w-full rounded-[12px] border border-border-default px-3.5 text-[16.5px] outline-none focus:border-primary"
          />
        </div>
      </div>
      {error && <div className="mt-3 text-[13px] font-semibold text-danger-fg">{error}</div>}
      <div className="mt-5 flex justify-end gap-3">
        <button type="button" onClick={onClose} className="h-[46px] rounded-[11px] border border-border-default bg-surface px-5 text-[16.5px] font-bold text-ink hover:bg-surface-tint">
          Cancel
        </button>
        <Button variant="primarySmall" className="h-[46px] w-auto px-[22px]" onClick={submit} disabled={create.isPending}>
          {create.isPending ? "Adding…" : "Add to calendar"}
        </Button>
      </div>
    </div>
  );
}

export default function MediaCalendarPage() {
  const calendar = useAcademicCalendarEvents();
  const shoots = useShootAssignments();
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [addOpen, setAddOpen] = useState(false);

  const events = calendar.data ?? [];
  const mediaEvents = (shoots.data?.ready ? shoots.data.data : []).filter((s) => s.event_title && s.scheduled_at);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, true>();
    for (const ev of events) map.set(ev.event_date.slice(0, 10), true);
    for (const s of mediaEvents) map.set(s.scheduled_at!.slice(0, 10), true);
    return map;
  }, [events, mediaEvents]);

  const weeks = getMonthGrid(cursor.year, cursor.month, "monday");

  const merged: MergedEvent[] = useMemo(() => {
    const fromCalendar: MergedEvent[] = events.map((ev) => ({
      key: `cal-${ev.id}`,
      date: ev.event_date.slice(0, 10),
      title: ev.title,
      meta: ev.description ?? "",
      tag: TYPE_LABEL[ev.event_type],
      tone: TYPE_TONE[ev.event_type],
    }));
    const fromShoots: MergedEvent[] = mediaEvents.map((s) => ({
      key: `shoot-${s.id}`,
      date: s.scheduled_at!.slice(0, 10),
      title: s.event_title!,
      meta: [s.venue, s.crew].filter(Boolean).join(" · "),
      tag: "Media",
      tone: "neutral",
    }));
    return [...fromCalendar, ...fromShoots].sort((a, b) => a.date.localeCompare(b.date));
  }, [events, mediaEvents]);

  const monthEvents = merged.filter((e) => {
    const d = new Date(e.date);
    return d.getFullYear() === cursor.year && d.getMonth() === cursor.month;
  });

  function shiftMonth(delta: number) {
    setCursor(({ year, month }) => {
      const next = new Date(year, month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  }

  const todayIso = toIsoDateString(new Date());

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Academic calendar</h1>
          <p className="mt-1 text-[13px] text-muted">Institution events on the academic calendar · add media events and plan coverage ahead.</p>
        </div>
        <Button variant="primarySmall" className="w-auto" onClick={() => setAddOpen((v) => !v)}>
          {addOpen ? "Close" : "+ Add media event"}
        </Button>
      </div>

      {addOpen && <AddMediaEventForm onClose={() => setAddOpen(false)} />}

      <div className="grid grid-cols-[1fr_1fr] items-start gap-4">
        <div data-mr-lift="1" className="rounded-card border border-border-default bg-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <button type="button" onClick={() => shiftMonth(-1)} className="flex size-8 items-center justify-center rounded-[9px] bg-surface-tint text-primary">
              ‹
            </button>
            <div className="text-center">
              <div className="text-[19px] font-extrabold text-ink">{monthLabel(cursor.year, cursor.month)}</div>
              <div className="text-[12px] text-subtle">{monthEvents.length} calendar events</div>
            </div>
            <button type="button" onClick={() => shiftMonth(1)} className="flex size-8 items-center justify-center rounded-[9px] bg-surface-tint text-primary">
              ›
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-bold text-subtle">
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
              <div key={i}>{d}</div>
            ))}
          </div>
          <div className="mt-1.5 flex flex-col gap-1.5">
            {weeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 gap-1.5">
                {week.map((cell, ci) => {
                  if (!cell.iso) return <div key={ci} />;
                  const hasEvents = eventsByDate.has(cell.iso);
                  const isToday = cell.iso === todayIso;
                  return (
                    <div
                      key={ci}
                      className={`flex aspect-square items-center justify-center rounded-[9px] text-[13px] font-bold ${
                        hasEvents ? "bg-accent-50 text-primary" : "text-ink"
                      } ${isToday ? "ring-2 ring-primary" : ""}`}
                    >
                      {cell.day}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div data-mr-lift="1" className="rounded-card border border-border-default bg-surface p-5">
          <h2 className="mb-3 text-[17px] font-extrabold text-ink">Events in {monthLabel(cursor.year, cursor.month).split(" ")[0]}</h2>
          {calendar.isLoading ? (
            <EmptyState message="Loading…" />
          ) : monthEvents.length === 0 ? (
            <EmptyState message="No events recorded this month." />
          ) : (
            <div className="flex flex-col gap-3">
              {monthEvents.map((ev) => {
                const date = new Date(`${ev.date}T00:00:00`);
                return (
                  <div key={ev.key} className="flex items-center gap-3.5 border-t border-divider pt-3 first:border-0 first:pt-0">
                    <div className="flex w-[52px] shrink-0 flex-col items-center rounded-[9px] border border-border-default bg-surface-muted py-1.5">
                      <span className="text-[16px] font-extrabold text-ink">{date.getDate()}</span>
                      <span className="text-[9.5px] font-bold uppercase text-subtle">{date.toLocaleDateString("en-IN", { weekday: "short" })}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[14.5px] font-bold text-ink">{ev.title}</div>
                      {ev.meta && <div className="text-[12.5px] text-subtle">{ev.meta}</div>}
                    </div>
                    <Badge tone={ev.tone}>{ev.tag}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
