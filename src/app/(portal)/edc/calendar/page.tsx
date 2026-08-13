"use client";

import { useMemo, useState } from "react";
import { useCalendarEvents } from "@/modules/edc/api/calendar";
import { useEdcEvents, useCreateEdcEvent, useUpdateEdcEvent, useDeleteEdcEvent, EDC_EVENT_TYPES, type EdcEventType } from "@/modules/edc/api/events";
import { pillSx } from "@/modules/edc/genericPage";

// Real backend connection, two DISTINCT sources merged for display only:
// 1. GET /academic-calendar-events — the shared, institution-wide calendar
//    (holidays/academic events). Read-only here: EDC_COORDINATOR write
//    access to this table was intentionally removed — those events belong
//    to Academic Coordinator/Principal and are visible to every role.
// 2. GET /me/edc-events — EDC's own events (the same real `edc_events`
//    table backing the "Events & Competitions" tab). Adding an event here
//    creates a row THERE, not in the shared calendar: it never appears on
//    any other role's calendar, and it has no dependency on a published
//    academic-calendar period (unlike the old flow, which required one and
//    could fail with "no calendar covers this date"). Visible to — and
//    editable/deletable by — ANY EDC_COORDINATOR account, not just its
//    creator, since edc_events has no per-row ownership restriction.

const DAY_NAMES = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

interface MergedEvent {
  key: string;
  title: string;
  date: string;
  note: string | null;
  kind: "holiday" | "academic" | "edc";
  editId?: number;
}

export default function EdcCalendarPage() {
  const now = useMemo(() => new Date(), []);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState<EdcEventType>(EDC_EVENT_TYPES[0]);
  const [venue, setVenue] = useState("");
  const [date, setDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  const academicEvents = useCalendarEvents();
  const edcEvents = useEdcEvents();
  const createEvent = useCreateEdcEvent();
  const updateEvent = useUpdateEdcEvent();
  const deleteEvent = useDeleteEdcEvent();

  const merged: MergedEvent[] = useMemo(() => {
    const a: MergedEvent[] = (academicEvents.data ?? []).map((e) => ({
      key: `academic-${e.id}`,
      title: e.title,
      date: e.event_date,
      note: e.description,
      kind: e.event_type === "holiday" ? "holiday" : "academic",
    }));
    const b: MergedEvent[] = (edcEvents.data ?? []).map((e) => ({
      key: `edc-${e.id}`,
      title: e.title,
      date: e.event_date,
      note: [e.event_type, e.venue].filter(Boolean).join(" · ") || null,
      kind: "edc",
      editId: e.id,
    }));
    return [...a, ...b];
  }, [academicEvents.data, edcEvents.data]);

  const monthEvents = useMemo(() => {
    return merged.filter((e) => {
      const d = new Date(e.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });
  }, [merged, year, month]);

  const cells = useMemo(() => {
    const first = new Date(year, month, 1).getDay();
    const days = new Date(year, month + 1, 0).getDate();
    const marked = new Set(monthEvents.map((e) => new Date(e.date).getDate()));
    const out: { label: string; hit: boolean; sun: boolean }[] = [];
    for (let i = 0; i < first; i++) out.push({ label: "", hit: false, sun: false });
    for (let d = 1; d <= days; d++) {
      const dow = new Date(year, month, d).getDay();
      out.push({ label: String(d), hit: marked.has(d), sun: dow === 0 });
    }
    return out;
  }, [year, month, monthEvents]);

  function prevMonth() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); } else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); } else setMonth((m) => m + 1);
  }

  function openModal() {
    setEditingId(null);
    setTitle("");
    setEventType(EDC_EVENT_TYPES[0]);
    setVenue("");
    setDate(new Date(year, month, Math.min(now.getDate(), 28)).toISOString().slice(0, 10));
    setError(null);
    setModalOpen(true);
  }

  function openEditModal(m: MergedEvent) {
    if (!m.editId) return;
    const row = (edcEvents.data ?? []).find((e) => e.id === m.editId);
    if (!row) return;
    setEditingId(row.id);
    setTitle(row.title);
    setEventType(row.event_type);
    setVenue(row.venue ?? "");
    setDate(row.event_date.slice(0, 10));
    setError(null);
    setModalOpen(true);
  }

  function submit() {
    if (!title.trim() || !date) {
      setError("Title and date are required.");
      return;
    }
    setError(null);
    const payload = { title: title.trim(), event_type: eventType, event_date: date, venue: venue || undefined };
    const onDone = { onSuccess: () => setModalOpen(false), onError: (e: unknown) => setError(e instanceof Error ? e.message : "Failed to save event.") };
    if (editingId) {
      updateEvent.mutate({ id: editingId, input: payload }, onDone);
    } else {
      createEvent.mutate(payload, onDone);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 1360 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 24 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: "0 0 8px", fontSize: 38, fontWeight: 800, letterSpacing: "-0.025em" }}>Academic Calendar</h1>
          <p style={{ margin: 0, fontSize: 15.5, color: "#64748B" }}>Institution-wide academic calendar (read-only) plus EDC's own events — visible only to EDC accounts, on top of the common calendar.</p>
        </div>
        <div onClick={openModal} data-edc-btn-primary="" style={{ display: "flex", alignItems: "center", gap: 9, height: 46, padding: "0 22px", borderRadius: 11, background: "#1D4ED8", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", flex: "none" }}>
          <span className="ms" style={{ fontSize: 19 }}>add</span>
          <span>Add EDC event</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 20 }}>
        <div style={{ background: "#fff", border: "1px solid #E6EBF2", borderRadius: 14, padding: "22px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <div onClick={prevMonth} data-edc-chevron="" style={{ width: 44, height: 44, borderRadius: 11, background: "#fff", border: "1px solid #E6EBF2", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#334155" }}>
              <span className="ms" style={{ fontSize: 20 }}>chevron_left</span>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em" }}>{MONTHS[month]} {year}</div>
              <div style={{ fontSize: 13, color: "#7B8AA0", marginTop: 3 }}>{monthEvents.length} calendar events</div>
            </div>
            <div onClick={nextMonth} data-edc-chevron="" style={{ width: 44, height: 44, borderRadius: 11, background: "#fff", border: "1px solid #E6EBF2", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#334155" }}>
              <span className="ms" style={{ fontSize: 20 }}>chevron_right</span>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0,1fr))", gap: 8, marginBottom: 8 }}>
            {DAY_NAMES.map((dn, i) => (
              <div key={i} style={{ textAlign: "center", fontSize: 12, fontWeight: 700, color: "#94A3B8" }}>{dn}</div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0,1fr))", gap: 8 }}>
            {cells.map((c, i) => (
              <div
                key={i}
                style={{
                  height: 52, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 11, fontSize: 15, cursor: "default",
                  fontWeight: c.hit ? 700 : 500,
                  color: c.hit ? "#1D4ED8" : c.sun ? "#B6C2D4" : "#0F172A",
                  background: c.hit ? "#EFF6FF" : c.sun ? "#F7F9FC" : "#fff",
                  border: `1px solid ${c.hit ? "#CFE0F7" : "#E9EEF6"}`,
                }}
              >
                {c.label}
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: "#fff", border: "1px solid #E6EBF2", borderRadius: 14, padding: "22px 24px" }}>
          <div style={{ fontSize: 21, fontWeight: 800, letterSpacing: "-0.015em", marginBottom: 14 }}>Events in {MONTHS[month]}</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {monthEvents
              .slice()
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((e) => {
                const d = new Date(e.date);
                return (
                  <div key={e.key} style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 0", borderBottom: "1px solid #EEF2F7" }}>
                    <div style={{ width: 56, height: 56, flex: "none", borderRadius: 11, background: "#EFF6FF", border: "1px solid #CFE0F7", color: "#1D4ED8", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                      <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1 }}>{d.getDate()}</div>
                      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em", color: "#7B8AA0", marginTop: 3 }}>{d.toLocaleDateString("en-IN", { weekday: "short" }).toUpperCase()}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>{e.title}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 4 }}>
                        <span className="ms" style={{ fontSize: 15, color: "#94A3B8" }}>{e.kind === "holiday" ? "lock" : e.kind === "edc" ? "groups" : "edit_calendar"}</span>
                        <span style={{ fontSize: 13, color: "#7B8AA0" }}>
                          {d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                          {e.note ? ` · ${e.note}` : ""}
                        </span>
                      </div>
                    </div>
                    {e.kind === "edc" && e.editId && (
                      <div style={{ display: "flex", gap: 8, flex: "none" }}>
                        <span onClick={() => openEditModal(e)} style={{ fontSize: 11.5, fontWeight: 700, color: "#334155", cursor: "pointer" }}>Edit</span>
                        <span onClick={() => deleteEvent.mutate(e.editId!)} style={{ fontSize: 11.5, fontWeight: 700, color: "#DC2626", cursor: "pointer" }}>Delete</span>
                      </div>
                    )}
                    <span style={{ ...pillSx(e.kind === "edc" ? "violet" : "blue"), fontSize: 12.5, padding: "5px 13px", flex: "none" }}>
                      {e.kind === "holiday" ? "Holiday" : e.kind === "edc" ? "EDC event" : "Academic event"}
                    </span>
                  </div>
                );
              })}
            {monthEvents.length === 0 && !academicEvents.isLoading && !edcEvents.isLoading && (
              <div style={{ padding: "24px 0", textAlign: "center", color: "#94A3B8", fontWeight: 600, fontSize: 13 }}>No events this month.</div>
            )}
          </div>
        </div>
      </div>

      {modalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }} onClick={() => setModalOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 560, maxHeight: "82vh", overflowY: "auto", background: "#fff", borderRadius: 16, boxShadow: "0 30px 70px rgba(15,23,42,0.28)", padding: "26px 28px" }}>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 4 }}>{editingId ? "Edit EDC event" : "Add an EDC event"}</div>
            <div style={{ fontSize: 14, color: "#64748B", marginBottom: 20 }}>
              {editingId ? "Visible to every EDC account — changes are immediate." : "Only visible to EDC accounts, layered on top of the common calendar — never appears on any other role's calendar."}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", color: "#94A3B8" }}>TITLE</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Investor connect · TiE Coimbatore" style={{ height: 42, padding: "0 13px", border: "1px solid #E2E8F0", borderRadius: 10, background: "#fff", fontFamily: "inherit", fontSize: 14, color: "#0F172A", outline: "none" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", color: "#94A3B8" }}>DATE</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ height: 42, padding: "0 13px", border: "1px solid #E2E8F0", borderRadius: 10, background: "#fff", fontFamily: "inherit", fontSize: 14, color: "#0F172A", outline: "none" }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", color: "#94A3B8" }}>TYPE</label>
                  <select value={eventType} onChange={(e) => setEventType(e.target.value as EdcEventType)} style={{ height: 42, padding: "0 13px", border: "1px solid #E2E8F0", borderRadius: 10, background: "#fff", fontFamily: "inherit", fontSize: 14, color: "#0F172A", outline: "none" }}>
                    {EDC_EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", color: "#94A3B8" }}>VENUE</label>
                <input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Innovation Centre Auditorium" style={{ height: 42, padding: "0 13px", border: "1px solid #E2E8F0", borderRadius: 10, background: "#fff", fontFamily: "inherit", fontSize: 14, color: "#0F172A", outline: "none" }} />
              </div>
              {error && <div style={{ fontSize: 12.5, color: "#DC2626", fontWeight: 600 }}>{error}</div>}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
              <div onClick={() => setModalOpen(false)} data-edc-row="" style={{ height: 42, padding: "0 20px", display: "flex", alignItems: "center", border: "1px solid #E2E8F0", borderRadius: 10, fontSize: 14, fontWeight: 600, color: "#475569", cursor: "pointer" }}>
                Cancel
              </div>
              <div onClick={submit} data-edc-btn-primary="" style={{ height: 42, padding: "0 22px", display: "flex", alignItems: "center", borderRadius: 10, background: "#1D4ED8", color: "#fff", fontSize: 14, fontWeight: 700, cursor: createEvent.isPending || updateEvent.isPending ? "default" : "pointer" }}>
                {createEvent.isPending || updateEvent.isPending ? "Saving…" : editingId ? "Save changes" : "Add event"}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
