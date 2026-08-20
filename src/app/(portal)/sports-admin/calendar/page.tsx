"use client";

import { useMemo, useState } from "react";
import { Card, Button, Input, Select, EmptyState, IconButton, Icon, Modal } from "@/components/ui";
import { useSportsCalendar, useCreateCalendarNote } from "@/modules/sports-admin/api/calendar";
import { getMonthGrid, monthLabel, todayDateOnly, viewedAcademicYearLabel } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";
import { ApiError } from "@/types/api";

const CATEGORY_OPTIONS = ["Fixture", "Trial", "Meet", "Holiday", "Institution"];

export default function SportsCalendarPage() {
  const today = todayDateOnly();
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(today);

  // Backend expects a 1-12 month; `viewMonth` stays 0-based to match getMonthGrid/monthLabel.
  const calendar = useSportsCalendar(viewYear, viewMonth + 1);
  const createNote = useCreateCalendarNote();

  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(CATEGORY_OPTIONS[0]);
  const [eventDate, setEventDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  function openModal() {
    setTitle("");
    setCategory(CATEGORY_OPTIONS[0]);
    setEventDate(selectedDate);
    setError(null);
    setShowModal(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createNote.mutateAsync({ title, category, event_date: eventDate });
      setShowModal(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  }

  const monthEntries = useMemo(
    () => [...(calendar.data?.entries ?? [])].sort((a, b) => a.date.localeCompare(b.date)),
    [calendar.data],
  );

  const entriesByDate = useMemo(() => {
    const map = new Map<string, typeof monthEntries>();
    for (const e of monthEntries) {
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    }
    return map;
  }, [monthEntries]);

  const weeks = useMemo(() => getMonthGrid(viewYear, viewMonth, "sunday"), [viewYear, viewMonth]);

  function weekdayAbbr(iso: string): string {
    return new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short" }).toUpperCase();
  }

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-[-.03em] text-ink">Academic Calendar</h1>
          <p className="mt-1 text-[13.5px] text-muted">
            Academic year {viewedAcademicYearLabel(viewYear, viewMonth)} · fixtures, trials and institution events
          </p>
        </div>
        <Button variant="primarySmall" className="inline-flex items-center gap-1.5 px-5 py-3" onClick={openModal}>
          <Icon name="add" size={16} />
          Add event
        </Button>
      </div>

      <div className="grid grid-cols-[1.1fr_1fr] items-start gap-4">
        <Card>
          <div className="mb-1 flex items-center justify-between">
            <IconButton
              icon="chevron_left"
              size={36}
              onClick={() => {
                const d = new Date(viewYear, viewMonth - 1, 1);
                setViewYear(d.getFullYear());
                setViewMonth(d.getMonth());
              }}
            />
            <div className="text-center">
              <h2 className="text-[18px] font-extrabold tracking-[-.02em] text-ink">{monthLabel(viewYear, viewMonth)}</h2>
              <div className="mt-0.5 text-[12px] text-muted">
                {monthEntries.length} calendar event{monthEntries.length === 1 ? "" : "s"}
              </div>
            </div>
            <IconButton
              icon="chevron_right"
              size={36}
              onClick={() => {
                const d = new Date(viewYear, viewMonth + 1, 1);
                setViewYear(d.getFullYear());
                setViewMonth(d.getMonth());
              }}
            />
          </div>
          <div className="mt-4 grid grid-cols-7 gap-1.5 text-center text-[11px] font-extrabold text-subtle">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <div key={i}>{d}</div>
            ))}
          </div>
          <div className="mt-1.5 grid grid-cols-7 gap-1.5">
            {weeks.flat().map((cell, i) => {
              if (!cell.iso) return <div key={i} className="h-[42px]" />;
              const hasEntries = (entriesByDate.get(cell.iso)?.length ?? 0) > 0;
              const selected = cell.iso === selectedDate;
              return (
                <button
                  key={cell.iso}
                  onClick={() => setSelectedDate(cell.iso!)}
                  className={cn(
                    "flex h-[42px] items-center justify-center rounded-[10px] border text-[13.5px] font-bold transition-colors",
                    hasEntries
                      ? "border-border-accent bg-accent-50 text-primary hover:bg-accent-100"
                      : "border-transparent text-muted hover:border-border-default hover:bg-surface-muted",
                    selected && "ring-2 ring-primary",
                  )}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="p-0">
          <div className="border-b border-divider px-5 py-4">
            <h2 className="text-[17px] font-extrabold tracking-[-.02em] text-ink">
              Events in {monthLabel(viewYear, viewMonth).split(" ")[0]}
            </h2>
          </div>
          <div className="flex flex-col gap-2.5 p-3">
            {calendar.isLoading ? (
              <EmptyState message="Loading…" />
            ) : monthEntries.length === 0 ? (
              <EmptyState message="No events in this month yet." />
            ) : (
              monthEntries.map((e, i) => {
                const selected = e.date === selectedDate;
                return (
                  <button
                    key={`${e.date}-${i}`}
                    onClick={() => setSelectedDate(e.date)}
                    className={cn(
                      "hover-lift flex items-center gap-3.5 rounded-[12px] border border-border-default bg-surface px-3.5 py-3 text-left",
                      selected && "selected-outline border-transparent",
                    )}
                  >
                    <div className="flex w-12 shrink-0 flex-col items-center rounded-[10px] border border-border-default bg-surface-muted py-1.5">
                      <span className="text-[16px] font-extrabold text-ink">{Number(e.date.slice(8, 10))}</span>
                      <span className="text-[9.5px] font-bold text-subtle">{weekdayAbbr(e.date)}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.5px] font-bold text-ink">{e.title}</div>
                      {e.meta && <div className="mt-0.5 truncate text-[12px] text-muted">{e.meta}</div>}
                    </div>
                    <span className="shrink-0 whitespace-nowrap rounded-pill bg-primary px-3 py-1 text-[11px] font-extrabold text-white">
                      {e.tag}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </Card>
      </div>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Add calendar event"
        subtitle="Added to the academic calendar"
      >
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-primary">Event</label>
            <Input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. District swimming meet" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Category</label>
              <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-primary">Date</label>
              <Input type="date" required value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
            </div>
          </div>
          {error && (
            <div className="rounded-[10px] border border-danger-border bg-danger-bg px-3.5 py-2.5 text-[13px] font-semibold text-danger-fg">
              {error}
            </div>
          )}
          <div className="mt-2 flex justify-end gap-3 border-t border-divider pt-5">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primarySmall" className="px-6" disabled={!title || !category || !eventDate || createNote.isPending}>
              {createNote.isPending ? "Adding…" : "Add event"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
