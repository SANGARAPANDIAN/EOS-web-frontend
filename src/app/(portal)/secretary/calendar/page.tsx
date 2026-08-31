"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useAcademicCalendars,
  useCalendarEvents,
  useCreateCalendarEvent,
  useUpdateCalendarEvent,
  useDeleteCalendarEvent,
  type CalendarEventRow,
  type CalendarEventType,
} from "@/modules/secretary/api/calendar";
import { QuickModal, type QuickFieldSpec } from "@/modules/secretary/QuickModal";
import { AcademicCalendarView } from "@/modules/shared/academic-calendar-view/AcademicCalendarView";

// REAL BACKEND WIRING — ZERO fake data. Reads/writes go through
// EOSbackend1's real `/academic-calendar` + `/academic-calendar-events`
// modules. One honest gap: the real `event_type` enum only has 2 values
// (holiday/event) vs a richer category picker — restricted to the 2 real
// values rather than faking the rest. No `published` flag exists either.
//
// Shares the same AcademicCalendarView component every other portal's
// academic-calendar page renders through — this page's own contribution is
// just wiring its calendar-id-scoped data (rather than HoD/Student/Faculty's
// month-windowed endpoint) and the write actions (add/edit/remove) the
// other, read-only portals don't have.

const EVENT_TYPE_OPTIONS: CalendarEventType[] = ["holiday", "event"];
const EVENT_TYPE_LABEL: Record<string, string> = { holiday: "Holiday", event: "Event" };

function toDateInputValue(d: string | Date): string {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toISOString().slice(0, 10);
}

export default function SecretaryCalendarPage() {
  const [toast, setToast] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  }

  const { data: calendars } = useAcademicCalendars();
  const currentCalendar = useMemo(() => {
    if (!calendars || calendars.length === 0) return undefined;
    const now = new Date();
    const active = calendars.find((c) => new Date(c.start_date) <= now && now <= new Date(c.end_date));
    if (active) return active;
    // Fall back to the most recently started calendar if none is "active" today.
    return [...calendars].sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())[0];
  }, [calendars]);

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  // Jump the view to wherever the active calendar actually is (today's
  // month if we're mid-semester, otherwise the semester's start month) —
  // once per calendar, not on every render.
  useEffect(() => {
    if (!currentCalendar) return;
    const start = new Date(currentCalendar.start_date);
    const end = new Date(currentCalendar.end_date);
    const today = new Date();
    const target = today >= start && today <= end ? today : start;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setViewYear(target.getFullYear());
    setViewMonth(target.getMonth());
  }, [currentCalendar]);

  const { data: events, isLoading, isError } = useCalendarEvents(currentCalendar?.id);
  const createMutation = useCreateCalendarEvent();
  const updateMutation = useUpdateCalendarEvent();
  const deleteMutation = useDeleteCalendarEvent();
  const [editingId, setEditingId] = useState<number | null>(null);

  // Real native date/time pickers, bounded to the real, currently-selected
  // academic calendar's own start_date/end_date — the server rejects any
  // event_date outside that range ("Event date must be within the academic
  // calendar date range"), so the picker itself only lets you pick a date
  // that will succeed, rather than letting you type something invalid and
  // finding out after submitting.
  const calendarMin = currentCalendar ? toDateInputValue(currentCalendar.start_date) : undefined;
  const calendarMax = currentCalendar ? toDateInputValue(currentCalendar.end_date) : undefined;
  const eventFields: QuickFieldSpec[] = [
    { key: "title", label: "Event title", type: "text", placeholder: "e.g. Department project review 3" },
    { key: "event_type", label: "Category", type: "select", options: EVENT_TYPE_OPTIONS },
    {
      key: "event_date",
      label: "Date",
      type: "date",
      min: calendarMin,
      max: calendarMax,
      hint: currentCalendar ? `Must fall within this calendar: ${new Date(currentCalendar.start_date).toLocaleDateString("en-IN")} – ${new Date(currentCalendar.end_date).toLocaleDateString("en-IN")}` : undefined,
    },
    { key: "start_time", label: "Start time", type: "time" },
    { key: "end_time", label: "End time", type: "time" },
  ];

  function openCreate() {
    setEditingId(null);
    setForm({ title: "", event_type: "event", event_date: "", start_time: "09:00", end_time: "10:00" });
    setModalOpen(true);
  }
  function openEdit(e: CalendarEventRow) {
    setEditingId(e.id);
    setForm({
      title: e.title,
      event_type: e.event_type,
      event_date: e.event_date.slice(0, 10),
      start_time: e.start_time ? e.start_time.slice(0, 5) : "09:00",
      end_time: e.end_time ? e.end_time.slice(0, 5) : "10:00",
    });
    setModalOpen(true);
  }
  async function submit() {
    if (!form.title?.trim()) {
      flash("Please fill in the title before saving.");
      return;
    }
    if (!currentCalendar) {
      flash("No academic calendar found to attach this event to.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(form.event_date || "").trim())) {
      flash("Pick a date for the event.");
      return;
    }
    if (calendarMin && calendarMax && (form.event_date < calendarMin || form.event_date > calendarMax)) {
      flash(`Pick a date between ${new Date(currentCalendar.start_date).toLocaleDateString("en-IN")} and ${new Date(currentCalendar.end_date).toLocaleDateString("en-IN")}.`);
      return;
    }
    try {
      if (editingId !== null) {
        await updateMutation.mutateAsync({
          id: editingId,
          input: {
            title: form.title,
            event_date: form.event_date,
            event_type: form.event_type as CalendarEventType,
            start_time: form.start_time,
            end_time: form.end_time,
          },
        });
        flash("Event updated.");
      } else {
        await createMutation.mutateAsync({
          academic_calendar_id: currentCalendar.id,
          title: form.title,
          event_date: form.event_date,
          event_type: form.event_type as CalendarEventType,
          start_time: form.start_time,
          end_time: form.end_time,
        });
        flash("Event added to the academic calendar.");
      }
      setModalOpen(false);
      setEditingId(null);
    } catch (err) {
      flash(err instanceof Error ? err.message : "Could not save the event — check it falls within the current calendar's date range.");
    }
  }
  async function onRemove(e: CalendarEventRow) {
    try {
      await deleteMutation.mutateAsync(e.id);
      flash(`${e.title} removed from the calendar.`);
    } catch (err) {
      flash(err instanceof Error ? err.message : "Could not remove the event.");
    }
  }

  return (
    <div>
      <AcademicCalendarView
        subtitle={
          currentCalendar
            ? `Batch ${currentCalendar.batch_id} · Semester ${currentCalendar.semester} · ${new Date(currentCalendar.start_date).toLocaleDateString("en-IN")} – ${new Date(currentCalendar.end_date).toLocaleDateString("en-IN")}`
            : "Loading academic calendar…"
        }
        events={events ?? []}
        isLoading={isLoading}
        isError={isError}
        viewYear={viewYear}
        viewMonth={viewMonth}
        onPrevMonth={() => {
          const d = new Date(viewYear, viewMonth - 1, 1);
          setViewYear(d.getFullYear());
          setViewMonth(d.getMonth());
        }}
        onNextMonth={() => {
          const d = new Date(viewYear, viewMonth + 1, 1);
          setViewYear(d.getFullYear());
          setViewMonth(d.getMonth());
        }}
        eventTypeLabel={(t) => EVENT_TYPE_LABEL[t] ?? t}
        headerAction={
          <button
            onClick={openCreate}
            className="flex items-center gap-2.5 whitespace-nowrap rounded-xl bg-primary px-6 py-4 text-[13.5px] font-semibold text-white"
          >
            ＋ Add event
          </button>
        }
        renderEventActions={(event) => (
          <div className="flex shrink-0 items-center gap-1">
            <button onClick={() => openEdit(event)} title="Edit event" className="rounded p-1.5 text-[11.7px] font-semibold text-primary">
              Edit
            </button>
            <button onClick={() => onRemove(event)} title="Remove event" className="rounded p-1.5 text-[11.7px] font-semibold text-danger-fg">
              Remove
            </button>
          </div>
        )}
      />

      <QuickModal
        open={modalOpen}
        title={editingId !== null ? "Edit calendar event" : "Add calendar event"}
        subtitle="Real institution academic calendar"
        cta={editingId !== null ? "Save changes" : "Add event"}
        fields={eventFields}
        values={form}
        onChange={(key, value) => setForm((f) => ({ ...f, [key]: value }))}
        onClose={() => { setModalOpen(false); setEditingId(null); }}
        onSubmit={submit}
      />

      {toast && (
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: "#0f172a", color: "#ffffff", fontSize: 12.2, fontWeight: 500, borderRadius: 12, padding: "14px 22px", boxShadow: "0 16px 40px rgba(15,23,42,0.3)", zIndex: 120 }}>{toast}</div>
      )}
    </div>
  );
}
