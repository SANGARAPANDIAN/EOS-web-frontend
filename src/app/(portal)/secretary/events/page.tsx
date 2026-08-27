"use client";

import { useMemo, useState } from "react";
import { tone } from "@/modules/secretary/helpers";
import { useMyIdentity } from "@/modules/student/api/profile";
import { useDepartmentEvents, useCreateDepartmentEvent, useRegisterForEvent, useAdvanceEvent, type DepartmentEventRow } from "@/modules/secretary/api/events";
import { QuickModal, type QuickFieldSpec } from "@/modules/secretary/QuickModal";

// Pixel-exact layout port of the `isEvents` screen from
// "Secretary Module - Web/Secretary Dashboard.dc.html", lines 1252-1287.
//
// REAL BACKEND WIRING — ZERO fake data. Reads/writes through EOSbackend1's
// new `/me/department-events` module (built this session against the real
// `department_events` table added via the Secretary module completion
// migration — distinct from venue_bookings/edc_events, neither of which
// matched this screen's registrations/capacity concept).

const STATUS_LABEL: Record<string, string> = { planning: "Planning", awaiting_approval: "Awaiting approval", approved: "Approved", completed: "Completed" };
const STATUS_CYCLE = ["planning", "awaiting_approval", "approved", "completed"];
function nextOf(cur: string) {
  const i = STATUS_CYCLE.indexOf(cur);
  return STATUS_CYCLE[(i + 1) % STATUS_CYCLE.length];
}

const EVENT_FIELDS: QuickFieldSpec[] = [
  { key: "title", label: "Event title", type: "text", placeholder: "e.g. Workshop on Applied ML" },
  { key: "kind", label: "Event type", type: "select", options: ["Workshop", "Guest lecture", "Symposium", "Panel", "Industrial visit"] },
  { key: "event_date", label: "Date", type: "text", placeholder: "22-23 Aug" },
  { key: "capacity", label: "Capacity", type: "text", placeholder: "150" },
];

export default function SecretaryEventsPage() {
  const [toast, setToast] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  }

  // Real, department-scoped login identity — replaces the old "find the CSE
  // department in the institution-wide list" hack that predated
  // one-secretary-per-department accounts.
  const { data: identity } = useMyIdentity();
  const myDept = useMemo(() => (identity?.department_id != null ? { id: identity.department_id } : undefined), [identity]);

  const { data: events, isLoading, error } = useDepartmentEvents(myDept?.id);

  const createMutation = useCreateDepartmentEvent();
  const registerMutation = useRegisterForEvent();
  const advanceMutation = useAdvanceEvent();

  function openCreate() {
    setForm({ title: "", kind: "Workshop", event_date: "", capacity: "150" });
    setModalOpen(true);
  }
  async function submit() {
    if (!form.title?.trim()) {
      flash("Please fill in the title before saving.");
      return;
    }
    if (!myDept) {
      flash("Department list isn't loaded yet — try again in a moment.");
      return;
    }
    try {
      await createMutation.mutateAsync({
        department_id: myDept.id,
        title: form.title,
        kind: form.kind,
        event_date: form.event_date || "TBD",
        capacity: parseInt(form.capacity, 10) || 100,
      });
      setModalOpen(false);
      flash("Event created.");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Could not create the event.");
    }
  }
  async function onRegister(e: DepartmentEventRow) {
    try {
      const updated = await registerMutation.mutateAsync({ id: e.id, count: 25 });
      const nr = (updated as unknown as { registrations: number }).registrations ?? e.registrations + 25;
      flash(nr >= e.capacity ? `Capacity reached for ${e.title}.` : "25 registrations added.");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Could not register.");
    }
  }
  async function onAdvance(e: DepartmentEventRow) {
    try {
      await advanceMutation.mutateAsync(e.id);
      const nx = e.status === "completed" ? "planning" : nextOf(e.status);
      flash(`${e.title} → ${STATUS_LABEL[nx]}`);
    } catch (err) {
      flash(err instanceof Error ? err.message : "Could not advance the event.");
    }
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, marginBottom: 26 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 33.1, fontWeight: 700, letterSpacing: -1 }}>Event &amp; Workshop Coordination</h1>
          <p style={{ margin: "8px 0 0", fontSize: 13.1, color: "#64748b" }}>Workshops, guest lectures and symposia — approvals, halls and registrations</p>
        </div>
        <button onClick={openCreate} style={{ border: 0, background: "#1e3a8a", color: "#ffffff", fontSize: 13.1, fontWeight: 600, borderRadius: 12, padding: "15px 24px", cursor: "pointer" }}>＋ New event</button>
      </div>

      {isLoading && <div style={{ padding: 40, textAlign: "center", fontSize: 12.6, color: "#94a3b8" }}>Loading events…</div>}
      {error && <div style={{ padding: 40, textAlign: "center", fontSize: 12.6, color: "#b91c1c" }}>{error instanceof Error ? error.message : "Could not load events."}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 18 }}>
        {(events ?? []).map((e) => {
          const label = STATUS_LABEL[e.status] ?? e.status;
          const t = tone(label);
          const pct = Math.min(100, Math.round((e.registrations / e.capacity) * 100)) + "%";
          const nextLabel = e.status === "completed" ? "Reopen" : `→ ${STATUS_LABEL[nextOf(e.status)]}`;
          return (
            <div key={e.id} data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, overflow: "hidden" }}>
              <div data-sec-row="" style={{ height: 96, background: "repeating-linear-gradient(135deg, #eef4ff 0 12px, #ffffff 12px 24px)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'JetBrains Mono',monospace", fontSize: 10.8, color: "#94a3b8", borderBottom: "1px solid #eef2f7" }}>event banner</div>
              <div style={{ padding: "18px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 10.8, fontWeight: 600, borderRadius: 999, padding: "5px 10px", background: t.bg, color: t.fg }}>{label}</span>
                  <span style={{ fontSize: 11.8, color: "#64748b" }}>{e.kind}</span>
                </div>
                <div style={{ fontSize: 14.8, fontWeight: 600, margin: "11px 0 4px" }}>{e.title}</div>
                <div style={{ fontSize: 11.3, color: "#64748b" }}>{e.event_date} · {e.venue?.name ?? "venue TBD"} · coordinator {e.owner ? `${e.owner.first_name} ${e.owner.last_name}` : "TBD"}</div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "16px 0 6px", fontSize: 11.3, color: "#475569" }}>
                  <span>Registrations</span><span style={{ fontFamily: "'JetBrains Mono',monospace" }}>{e.registrations} / {e.capacity}</span>
                </div>
                <div style={{ height: 6, borderRadius: 999, background: "#eef2f7", overflow: "hidden" }}>
                  <div style={{ height: "100%", background: "#1e3a8a", borderRadius: 999, width: pct }} />
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                  <button onClick={() => onRegister(e)} style={{ flex: 1, border: "1px solid #dbe6ff", background: "#ffffff", color: "#1e3a8a", fontSize: 11.3, fontWeight: 600, borderRadius: 9, padding: "10px 0", cursor: "pointer" }}>+25 registrations</button>
                  <button onClick={() => onAdvance(e)} style={{ flex: 1, border: "1px solid #e5e9f2", background: "#ffffff", color: "#475569", fontSize: 11.3, fontWeight: 600, borderRadius: 9, padding: "10px 0", cursor: "pointer" }}>{nextLabel}</button>
                </div>
              </div>
            </div>
          );
        })}
        {!isLoading && !error && (events ?? []).length === 0 && (
          <div style={{ gridColumn: "1 / -1", padding: 44, textAlign: "center", fontSize: 12.2, color: "#94a3b8" }}>No events scheduled yet.</div>
        )}
      </div>

      {modalOpen && (
        <QuickModal
          open
          title="New event"
          subtitle="Real event record, saved to the department register (venue/coordinator assigned later)"
          cta="Create event"
          fields={EVENT_FIELDS}
          values={form}
          onChange={(key, value) => setForm((f) => ({ ...f, [key]: value }))}
          onClose={() => setModalOpen(false)}
          onSubmit={submit}
        />
      )}

      {toast && (
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: "#0f172a", color: "#ffffff", fontSize: 12.2, fontWeight: 500, borderRadius: 12, padding: "14px 22px", boxShadow: "0 16px 40px rgba(15,23,42,0.3)", zIndex: 120 }}>{toast}</div>
      )}
    </div>
  );
}
