"use client";

import { useState } from "react";
import { useEdcEvents, useCreateEdcEvent, useUpdateEdcEvent, useDeleteEdcEvent, EDC_EVENT_TYPES, EDC_EVENT_STATUSES, type EdcEventRow, type EdcEventType, type EdcEventStatus } from "@/modules/edc/api/events";
import { pillSx } from "@/modules/edc/genericPage";

// Real backend connection — GET/POST /me/edc-events, added this session on
// a real `edc_events` table (confirmed via live DB audit: no generic
// events table existed anywhere before). Rendered as cards, matching the
// design's own card layout for this screen (not a table, unlike most other
// Tier-B screens).

const inputSx = { height: 40, padding: "0 12px", border: "1px solid #E2E8F0", borderRadius: 9, background: "#fff", fontFamily: "inherit", fontSize: 13.5, color: "#0F172A", outline: "none", width: "100%" } as const;

function statusTone(status: EdcEventStatus) {
  if (status === "Completed") return pillSx("slate");
  if (status === "Cancelled") return pillSx("red");
  if (status === "Registrations Open") return pillSx("green");
  return pillSx("blue");
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export default function EdcEventsPage() {
  const events = useEdcEvents();
  const create = useCreateEdcEvent();
  const update = useUpdateEdcEvent();
  const remove = useDeleteEdcEvent();
  const [filter, setFilter] = useState<"All" | EdcEventType>("All");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", event_type: EDC_EVENT_TYPES[0] as EdcEventType, event_date: "", venue: "", participants_count: "", status: EDC_EVENT_STATUSES[0] as EdcEventStatus });

  const rows = (events.data ?? []).filter((e) => filter === "All" || e.event_type === filter);

  function openCreate() {
    setEditingId(null);
    setForm({ title: "", event_type: EDC_EVENT_TYPES[0], event_date: "", venue: "", participants_count: "", status: EDC_EVENT_STATUSES[0] });
    setError(null);
    setModalOpen(true);
  }

  function openEdit(e: EdcEventRow) {
    setEditingId(e.id);
    setForm({
      title: e.title,
      event_type: e.event_type,
      event_date: e.event_date.slice(0, 10),
      venue: e.venue ?? "",
      participants_count: e.participants_count !== null ? String(e.participants_count) : "",
      status: e.status,
    });
    setError(null);
    setModalOpen(true);
  }

  function submit() {
    if (!form.title.trim() || !form.event_date) {
      setError("Title and date are required.");
      return;
    }
    setError(null);
    const payload = {
      title: form.title.trim(),
      event_type: form.event_type,
      event_date: form.event_date,
      venue: form.venue || undefined,
      participants_count: form.participants_count ? Number(form.participants_count) : undefined,
      status: form.status,
    };
    const onDone = { onSuccess: () => setModalOpen(false), onError: (e: unknown) => setError(e instanceof Error ? e.message : "Failed to save event.") };
    if (editingId) {
      update.mutate({ id: editingId, input: payload }, onDone);
    } else {
      create.mutate(payload, onDone);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 1400 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 style={{ margin: "0 0 8px", fontSize: 38, fontWeight: 800, letterSpacing: "-0.025em" }}>Events &amp; Competitions</h1>
          <p style={{ margin: 0, fontSize: 15.5, color: "#64748B" }}>Workshops, hackathons, pitch days and investor connects run by the cell.</p>
        </div>
        <div data-edc-btn-primary="" onClick={openCreate} style={{ padding: "12px 20px", borderRadius: 11, background: "#1D4ED8", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
          + Schedule Event
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {(["All", ...EDC_EVENT_TYPES] as const).map((t) => (
          <span
            key={t}
            onClick={() => setFilter(t)}
            style={{
              fontSize: 13, fontWeight: 600, padding: "7px 15px", borderRadius: 99, cursor: "pointer",
              color: filter === t ? "#fff" : "#334155",
              background: filter === t ? "#1D4ED8" : "#fff",
              border: filter === t ? "none" : "1px solid #E2E8F0",
            }}
          >
            {t}
          </span>
        ))}
      </div>

      {events.isLoading && <div style={{ color: "#94A3B8", fontSize: 14 }}>Loading…</div>}
      {events.isError && <div style={{ color: "#DC2626", fontWeight: 600, fontSize: 14 }}>{events.error instanceof Error ? events.error.message : "Failed to load events."}</div>}
      {rows.length === 0 && !events.isLoading && !events.isError && (
        <div data-edc-lift="" style={{ background: "#fff", border: "1px solid #E6EBF2", borderRadius: 14, padding: "48px 24px", textAlign: "center", color: "#94A3B8", fontWeight: 600, fontSize: 14 }}>
          {events.data?.length === 0 ? "No events scheduled yet." : "No events match this filter."}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 16 }}>
        {rows.map((e) => (
          <div key={e.id} data-edc-lift="" style={{ background: "#fff", border: "1px solid #E6EBF2", borderRadius: 14, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: "#3B6FD4", background: "#EFF6FF", borderRadius: 99, padding: "3px 10px" }}>{e.event_type}</span>
              <span style={statusTone(e.status)}>{e.status}</span>
            </div>
            <div style={{ fontSize: 16.5, fontWeight: 800, letterSpacing: "-0.01em" }}>{e.title}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: "#64748B" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span className="ms" style={{ fontSize: 17 }}>calendar_month</span>{formatDate(e.event_date)}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span className="ms" style={{ fontSize: 17 }}>location_on</span>{e.venue ?? "Venue not set"}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span className="ms" style={{ fontSize: 17 }}>groups</span>{e.participants_count !== null ? `${e.participants_count} participants` : "No headcount recorded"}</div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <span onClick={() => openEdit(e)} style={{ fontSize: 12, fontWeight: 700, color: "#334155", border: "1px solid #E2E8F0", borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}>Edit</span>
              <span onClick={() => remove.mutate(e.id)} style={{ fontSize: 12, fontWeight: 700, color: "#DC2626", border: "1px solid #FECACA", borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}>Delete</span>
            </div>
          </div>
        ))}
      </div>

      {modalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={() => setModalOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, padding: 26, width: 440, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{editingId ? "Edit Event" : "Schedule Event"}</div>
            {error && <div style={{ padding: "9px 12px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, color: "#DC2626", fontSize: 12.5, fontWeight: 600 }}>{error}</div>}
            <div>
              <label style={{ fontSize: 11.5, fontWeight: 700, color: "#94A3B8", display: "block", marginBottom: 5 }}>TITLE</label>
              <input style={inputSx} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Founder Fundamentals Workshop" />
            </div>
            <div>
              <label style={{ fontSize: 11.5, fontWeight: 700, color: "#94A3B8", display: "block", marginBottom: 5 }}>TYPE</label>
              <select style={inputSx} value={form.event_type} onChange={(e) => setForm((f) => ({ ...f, event_type: e.target.value as EdcEventType }))}>
                {EDC_EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 11.5, fontWeight: 700, color: "#94A3B8", display: "block", marginBottom: 5 }}>DATE</label>
                <input type="date" style={inputSx} value={form.event_date} onChange={(e) => setForm((f) => ({ ...f, event_date: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 11.5, fontWeight: 700, color: "#94A3B8", display: "block", marginBottom: 5 }}>PARTICIPANTS</label>
                <input type="number" style={inputSx} value={form.participants_count} onChange={(e) => setForm((f) => ({ ...f, participants_count: e.target.value }))} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11.5, fontWeight: 700, color: "#94A3B8", display: "block", marginBottom: 5 }}>VENUE</label>
              <input style={inputSx} value={form.venue} onChange={(e) => setForm((f) => ({ ...f, venue: e.target.value }))} placeholder="e.g. Innovation Centre Auditorium" />
            </div>
            {editingId && (
              <div>
                <label style={{ fontSize: 11.5, fontWeight: 700, color: "#94A3B8", display: "block", marginBottom: 5 }}>STATUS</label>
                <select style={inputSx} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as EdcEventStatus }))}>
                  {EDC_EVENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}
            <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
              <div onClick={() => setModalOpen(false)} data-edc-row="" style={{ flex: 1, textAlign: "center", padding: "11px 0", borderRadius: 9, border: "1px solid #E2E8F0", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>Cancel</div>
              <div data-edc-btn-primary="" onClick={submit} style={{ flex: 1, textAlign: "center", padding: "11px 0", borderRadius: 9, background: "#1D4ED8", color: "#fff", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>
                {create.isPending || update.isPending ? "Saving…" : editingId ? "Save changes" : "Schedule"}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
