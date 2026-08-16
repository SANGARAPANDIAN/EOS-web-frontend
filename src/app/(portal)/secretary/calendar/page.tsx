"use client";

import { useMemo, useState } from "react";
import {
  useAcademicCalendars,
  useCalendarEvents,
  useCreateCalendarEvent,
  useDeleteCalendarEvent,
  type CalendarEventRow,
  type CalendarEventType,
} from "@/modules/secretary/api/calendar";
import { QuickModal, type QuickFieldSpec } from "@/modules/secretary/QuickModal";

// Pixel-exact layout port of the `isCalendar` screen from
// "Secretary Module - Web/Secretary Dashboard.dc.html", lines 1183-1250.
//
// REAL BACKEND WIRING — ZERO fake data. Reads/writes go through
// EOSbackend1's real `/academic-calendar` + `/academic-calendar-events`
// modules (GET routes are open to any authenticated role already;
// Secretary added to the write routes). See
// `src/modules/secretary/api/calendar.ts` header comment for the one
// honest gap: the real `event_type` enum only has 2 values (holiday/
// event) vs the design's 6-category picker — restricted to the 2 real
// values rather than faking the rest. No `published` flag exists either.

const EVENT_TYPE_OPTIONS: CalendarEventType[] = ["holiday", "event"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const EVENT_FIELDS: QuickFieldSpec[] = [
  { key: "title", label: "Event title", type: "text", placeholder: "e.g. Department project review 3" },
  { key: "event_type", label: "Category", type: "select", options: EVENT_TYPE_OPTIONS },
  { key: "event_date", label: "Date (YYYY-MM-DD)", type: "text", placeholder: "2026-08-20" },
  { key: "start_time", label: "Start time (HH:mm)", type: "text", placeholder: "09:00" },
  { key: "end_time", label: "End time (HH:mm)", type: "text", placeholder: "10:00" },
];

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

  const { data: events, isLoading, error } = useCalendarEvents(currentCalendar?.id);
  const createMutation = useCreateCalendarEvent();
  const deleteMutation = useDeleteCalendarEvent();

  function openCreate() {
    setForm({ title: "", event_type: "event", event_date: "", start_time: "09:00", end_time: "10:00" });
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
      flash("Enter the date as YYYY-MM-DD, e.g. 2026-08-20.");
      return;
    }
    try {
      await createMutation.mutateAsync({
        academic_calendar_id: currentCalendar.id,
        title: form.title,
        event_date: form.event_date,
        event_type: form.event_type as CalendarEventType,
        start_time: form.start_time,
        end_time: form.end_time,
      });
      setModalOpen(false);
      flash("Event added to the academic calendar.");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Could not add the event — check it falls within the current calendar's date range.");
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

  const sortedEvents = useMemo(() => [...(events ?? [])].sort((a, b) => a.event_date.localeCompare(b.event_date)), [events]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, marginBottom: 26 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 34.8, fontWeight: 700, letterSpacing: -1 }}>Academic Calendar</h1>
          <p style={{ margin: "9px 0 0", fontSize: 13.5, color: "#64748b" }}>
            {currentCalendar ? `Batch ${currentCalendar.batch_id} · Semester ${currentCalendar.semester} · ${new Date(currentCalendar.start_date).toLocaleDateString("en-IN")} – ${new Date(currentCalendar.end_date).toLocaleDateString("en-IN")}` : "Loading academic calendar…"}
          </p>
        </div>
        <button onClick={openCreate} style={{ display: "flex", alignItems: "center", gap: 10, border: 0, background: "#1e3a8a", color: "#ffffff", fontSize: 13.5, fontWeight: 600, borderRadius: 12, padding: "16px 26px", whiteSpace: "nowrap", cursor: "pointer" }}>＋ Add event</button>
      </div>

      <div data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 16, padding: "26px 26px 12px" }}>
        <h2 style={{ margin: "0 0 18px", fontSize: 18.3, fontWeight: 700, letterSpacing: -0.3 }}>Events this semester</h2>
        {isLoading && <div style={{ padding: "26px 0 34px", fontSize: 13.1, color: "#94a3b8" }}>Loading events…</div>}
        {error && <div style={{ padding: "26px 0 34px", fontSize: 13.1, color: "#b91c1c" }}>{error instanceof Error ? error.message : "Could not load calendar events."}</div>}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {sortedEvents.map((e) => {
            const dt = new Date(e.event_date);
            return (
              <div key={e.id} data-sec-row="" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px 18px", padding: "14px 0", borderBottom: "1px solid #f1f5f9" }}>
                <div data-sec-lift="" style={{ width: 62, flex: "0 0 auto", border: "1px solid #e5e9f2", borderRadius: 12, padding: "9px 0", textAlign: "center", lineHeight: 1.2 }}>
                  <div style={{ fontSize: 19.1, fontWeight: 700, letterSpacing: -0.5 }}>{dt.getDate()}</div>
                  <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 0.8, color: "#94a3b8" }}>{MONTH_NAMES[dt.getMonth()].slice(0, 3).toUpperCase()}</div>
                </div>
                <div style={{ flex: "1 1 150px", minWidth: 150 }}>
                  <div style={{ fontSize: 14.8, fontWeight: 700, letterSpacing: -0.2 }}>{e.title}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.2, color: "#64748b", marginTop: 3 }}>{e.start_time && e.end_time ? `${e.start_time.slice(0, 5)} – ${e.end_time.slice(0, 5)}` : "All day"}{e.description ? <><span style={{ color: "#cbd5e1" }}>·</span>{e.description}</> : null}</div>
                </div>
                <span style={{ flex: "0 0 auto", fontSize: 12.2, fontWeight: 500, color: "#1d4ed8", background: "#eef4ff", borderRadius: 999, padding: "8px 16px" }}>{e.event_type.toUpperCase()}</span>
                <button onClick={() => onRemove(e)} title="Remove event" style={{ flex: "0 0 auto", border: 0, background: "transparent", color: "#b91c1c", fontSize: 11.7, fontWeight: 600, cursor: "pointer", padding: 6 }}>Remove</button>
              </div>
            );
          })}
          {!isLoading && !error && sortedEvents.length === 0 && (
            <div style={{ padding: "26px 0 34px", fontSize: 13.1, color: "#94a3b8" }}>No events in this calendar yet.</div>
          )}
        </div>
      </div>

      <QuickModal
        open={modalOpen}
        title="Add calendar event"
        subtitle="Added to the real institution academic calendar"
        cta="Add event"
        fields={EVENT_FIELDS}
        values={form}
        onChange={(key, value) => setForm((f) => ({ ...f, [key]: value }))}
        onClose={() => setModalOpen(false)}
        onSubmit={submit}
      />

      {toast && (
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: "#0f172a", color: "#ffffff", fontSize: 12.2, fontWeight: 500, borderRadius: 12, padding: "14px 22px", boxShadow: "0 16px 40px rgba(15,23,42,0.3)", zIndex: 120 }}>{toast}</div>
      )}
    </div>
  );
}
