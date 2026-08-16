"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Badge, Button, Input, Select, EmptyState } from "@/components/ui";
import { useInstitutionAcademicCalendar, useCreateCalendarEvent } from "@/modules/higher-education/api/calendar";
import { getMonthGrid, monthLabel, toIsoDateString } from "@/lib/utils/date";

const EVENT_TYPE_LABEL: Record<string, string> = {
  holiday: "Holiday",
  event: "Event",
  instruction: "Instruction",
  assessment: "Assessment",
  placement: "Placement",
  institution: "Institution",
};

const CATEGORY_OPTIONS = ["Instruction", "Test", "Holiday", "Records", "Counselling", "Applications", "Funding", "Institution"];

function AddCalendarEventModal({ onClose }: { onClose: () => void }) {
  const createEvent = useCreateCalendarEvent();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState(CATEGORY_OPTIONS[0]);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!title.trim() || !date) {
      setError("Event and date are required.");
      return;
    }
    setError(null);
    try {
      await createEvent.mutateAsync({ title: title.trim(), event_date: date, category });
      onClose();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Could not save this event.");
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/45 p-14">
      <div className="w-full max-w-[560px] rounded-modal bg-surface">
        <div className="flex items-start justify-between gap-5 border-b border-divider px-[26px] py-[22px]">
          <div>
            <div className="text-[19px] font-extrabold text-ink">Add calendar event</div>
            <div className="mt-1 text-[13px] text-muted">Fields left blank stay unrecorded and can be filled later.</div>
          </div>
          <button type="button" onClick={onClose} className="flex size-[34px] shrink-0 items-center justify-center rounded-[9px] border border-border-default text-[16px] text-body">
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 px-[26px] py-[22px]">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Event</label>
            <Input className="mt-1.5" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Date</label>
            <Input className="mt-1.5" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Category</label>
            <Select className="mt-1.5" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
          {error && <div className="col-span-2 text-[13px] font-semibold text-danger-fg">{error}</div>}
        </div>

        <div className="flex justify-end gap-2.5 border-t border-divider px-[26px] py-[18px]">
          <Button variant="secondary" className="w-auto" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primarySmall" onClick={submit} disabled={createEvent.isPending}>
            Save event
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function HigherEducationCalendarPage() {
  const calendar = useInstitutionAcademicCalendar();
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [showAdd, setShowAdd] = useState(false);

  const events = calendar.data?.events ?? [];
  const eventsByDate = useMemo(() => {
    const map = new Map<string, typeof events>();
    for (const ev of events) {
      const iso = ev.event_date.slice(0, 10);
      const list = map.get(iso) ?? [];
      list.push(ev);
      map.set(iso, list);
    }
    return map;
  }, [events]);

  const weeks = getMonthGrid(cursor.year, cursor.month, "monday");
  const monthEvents = events
    .filter((ev) => {
      const d = new Date(ev.event_date);
      return d.getFullYear() === cursor.year && d.getMonth() === cursor.month;
    })
    .sort((a, b) => a.event_date.localeCompare(b.event_date));

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
          <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Academic Calendar</h1>
          <p className="mt-1 text-[13px] text-muted">Every batch&apos;s calendar merged with the cell&apos;s own events · you can add new events.</p>
        </div>
        <Button variant="primarySmall" className="w-auto" onClick={() => setShowAdd(true)}>
          Add event
        </Button>
      </div>

      {showAdd && <AddCalendarEventModal onClose={() => setShowAdd(false)} />}

      <div className="grid grid-cols-[1fr_1fr] gap-4 items-start">
        <div className="rounded-card border border-border-default bg-surface p-5">
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

        <div className="rounded-card border border-border-default bg-surface p-5">
          <h2 className="mb-3 text-[17px] font-extrabold text-ink">Events in {monthLabel(cursor.year, cursor.month).split(" ")[0]}</h2>
          {calendar.isLoading ? (
            <EmptyState message="Loading…" />
          ) : monthEvents.length === 0 ? (
            <EmptyState message="No events recorded this month." />
          ) : (
            <div className="flex flex-col gap-3">
              {monthEvents.map((ev) => {
                const date = new Date(ev.event_date);
                return (
                  <div key={ev.id} className="flex items-center gap-3.5 border-t border-divider pt-3 first:border-0 first:pt-0">
                    <div className="flex w-[52px] shrink-0 flex-col items-center rounded-[9px] border border-border-default bg-surface-muted py-1.5">
                      <span className="text-[16px] font-extrabold text-ink">{date.getDate()}</span>
                      <span className="text-[9.5px] font-bold uppercase text-subtle">{date.toLocaleDateString("en-IN", { weekday: "short" })}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[14.5px] font-bold text-ink">{ev.title}</div>
                      {ev.description && <div className="text-[12.5px] text-subtle">{ev.description}</div>}
                    </div>
                    <Badge tone="accent">{EVENT_TYPE_LABEL[ev.event_type] ?? ev.event_type}</Badge>
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
