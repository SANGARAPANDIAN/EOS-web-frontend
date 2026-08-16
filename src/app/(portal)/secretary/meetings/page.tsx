"use client";

import { useMemo, useState } from "react";
import { tone } from "@/modules/secretary/helpers";
import { useBatchesLookup, useDepartmentsLookup } from "@/modules/secretary/api/announcements";
import { useMeetings, useCreateMeeting, useUpdateMom, useCirculateMom, useToggleActionItem, type MeetingRow } from "@/modules/secretary/api/meetings";
import { QuickModal, type QuickFieldSpec } from "@/modules/secretary/QuickModal";

// Pixel-exact layout port of the `isMeetings` screen from
// "Secretary Module - Web/Secretary Dashboard.dc.html", lines 678-717.
//
// REAL BACKEND WIRING — ZERO fake data. Reads/writes through EOSbackend1's
// new `/me/department-meetings` module (built this session against the
// real `department_meetings`/`meeting_action_items` tables added via the
// Secretary module completion migration). New meetings start with zero
// action items (a genuine empty state) — the design's fixed action-point
// checklist per meeting has no "add a point" affordance of its own, so
// none is invented here either.

const STATUS_LABEL: Record<string, string> = { scheduled: "Scheduled", recorded: "Recorded", circulated: "Circulated" };

const MEETING_FIELDS: QuickFieldSpec[] = [
  { key: "title", label: "Meeting title", type: "text", placeholder: "e.g. Class committee meeting · II year" },
  { key: "meeting_at", label: "Date & time (YYYY-MM-DDTHH:mm)", type: "text", placeholder: "2026-08-20T15:00" },
  { key: "venue", label: "Venue", type: "text", placeholder: "CSE seminar hall" },
  { key: "invitee_count", label: "Invitees", type: "text", placeholder: "12" },
];
const MOM_FIELDS: QuickFieldSpec[] = [{ key: "mom_text", label: "Minutes of meeting", type: "area", placeholder: "Decisions taken, owners and deadlines..." }];

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "numeric", minute: "2-digit", hour12: true });
}

export default function SecretaryMeetingsPage() {
  const [toast, setToast] = useState("");
  const [modal, setModal] = useState<{ type: "meeting" } | { type: "mom"; id: number } | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  }

  const { data: batches } = useBatchesLookup();
  const currentBatchId = useMemo(() => (batches ?? []).reduce<number | undefined>((best, b) => (best === undefined ? b.id : best), undefined), [batches]);
  const { data: departments } = useDepartmentsLookup(currentBatchId);
  const cseDept = useMemo(() => (departments ?? []).find((d) => d.code?.toUpperCase() === "CSE") ?? departments?.[0], [departments]);

  const { data: meetings, isLoading, error } = useMeetings(cseDept?.id);
  const createMutation = useCreateMeeting();
  const updateMomMutation = useUpdateMom();
  const circulateMutation = useCirculateMom();
  const toggleActionItemMutation = useToggleActionItem();

  function openSchedule() {
    setModal({ type: "meeting" });
    setForm({ title: "", meeting_at: "", venue: "CSE seminar hall", invitee_count: "12" });
  }
  function openMom(m: MeetingRow) {
    setModal({ type: "mom", id: m.id });
    setForm({ mom_text: m.mom_text ?? "" });
  }
  async function submit() {
    if (!modal) return;
    if (modal.type === "meeting") {
      if (!form.title?.trim()) {
        flash("Please fill in the title before saving.");
        return;
      }
      if (!cseDept) {
        flash("Department list isn't loaded yet — try again in a moment.");
        return;
      }
      try {
        await createMutation.mutateAsync({
          department_id: cseDept.id,
          title: form.title,
          meeting_at: form.meeting_at || new Date().toISOString(),
          venue: form.venue,
          invitee_count: parseInt(form.invitee_count, 10) || 0,
        });
        flash("Meeting scheduled.");
      } catch (err) {
        flash(err instanceof Error ? err.message : "Could not schedule the meeting.");
      }
    } else {
      try {
        await updateMomMutation.mutateAsync({ id: modal.id, mom_text: form.mom_text });
        flash("Minutes saved.");
      } catch (err) {
        flash(err instanceof Error ? err.message : "Could not save the minutes.");
      }
    }
    setModal(null);
  }
  async function onCirculate(m: MeetingRow) {
    try {
      await circulateMutation.mutateAsync(m.id);
      flash(`Minutes circulated to ${m.invitee_count} invitees.`);
    } catch (err) {
      flash(err instanceof Error ? err.message : "Record the minutes before circulating.");
    }
  }
  async function toggleAction(m: MeetingRow, itemId: number, wasDone: boolean) {
    try {
      await toggleActionItemMutation.mutateAsync({ meetingId: m.id, itemId });
      flash(wasDone ? "Action point reopened." : "Action point closed.");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Could not update the action point.");
    }
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, marginBottom: 26 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 33.1, fontWeight: 700, letterSpacing: -1 }}>Meeting &amp; MoM Management</h1>
          <p style={{ margin: "8px 0 0", fontSize: 13.1, color: "#64748b" }}>Schedule department meetings, capture minutes and circulate action points</p>
        </div>
        <button onClick={openSchedule} style={{ border: 0, background: "#1e3a8a", color: "#ffffff", fontSize: 13.1, fontWeight: 600, borderRadius: 12, padding: "15px 24px", cursor: "pointer" }}>＋ Schedule meeting</button>
      </div>

      {isLoading && <div style={{ padding: 40, textAlign: "center", fontSize: 12.6, color: "#94a3b8" }}>Loading meetings…</div>}
      {error && <div style={{ padding: 40, textAlign: "center", fontSize: 12.6, color: "#b91c1c" }}>{error instanceof Error ? error.message : "Could not load meetings."}</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {(meetings ?? []).map((m) => {
          const label = STATUS_LABEL[m.mom_status] ?? m.mom_status;
          const t = tone(label);
          return (
            <div key={m.id} data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, padding: 20 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 14.8, fontWeight: 600 }}>{m.title}</span>
                    <span style={{ fontSize: 10.8, fontWeight: 600, borderRadius: 999, padding: "5px 10px", background: t.bg, color: t.fg }}>{label}</span>
                  </div>
                  <div style={{ fontSize: 11.7, color: "#64748b", marginTop: 5 }}>{fmtDateTime(m.meeting_at)} · {m.venue ?? "—"} · {m.invitee_count} invited{m.chair ? ` · chaired by ${m.chair.email}` : ""}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <span data-sec-soft="" onClick={() => openMom(m)} style={{ border: "1px solid #dbe6ff", background: "#ffffff", color: "#1e3a8a", fontSize: 11.3, fontWeight: 600, borderRadius: 9, padding: "9px 14px", cursor: "pointer" }}>{m.mom_text ? "Edit MoM" : "Write MoM"}</span>
                  <span data-sec-nav-item="" onClick={() => onCirculate(m)} style={{ border: "1px solid #e5e9f2", background: "#ffffff", color: "#475569", fontSize: 11.3, fontWeight: 600, borderRadius: 9, padding: "9px 14px", cursor: "pointer" }}>Circulate</span>
                </div>
              </div>
              {!!m.mom_text && (
                <div style={{ background: "#ffffff", border: "1px solid #eef2f7", borderRadius: 12, padding: "14px 16px", marginTop: 14 }}>
                  <div style={{ fontSize: 10.8, fontWeight: 600, letterSpacing: 0.7, textTransform: "uppercase", color: "#94a3b8", marginBottom: 7 }}>Minutes</div>
                  <div style={{ fontSize: 11.7, color: "#334155", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{m.mom_text}</div>
                </div>
              )}
              {m.action_items.length > 0 && (
                <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
                  {m.action_items.map((ac) => (
                    <span key={ac.id} onClick={() => toggleAction(m, ac.id, ac.done)} style={{ border: "1px solid #e5e9f2", borderRadius: 999, padding: "8px 14px", fontSize: 11.8, fontWeight: 600, cursor: "pointer", background: ac.done ? "#ecfdf5" : "#ffffff", color: ac.done ? "#047857" : "#475569" }}>{ac.done ? "✓" : "○"} {ac.label}</span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {!isLoading && !error && (meetings ?? []).length === 0 && (
          <div data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, padding: 44, textAlign: "center", fontSize: 12.2, color: "#94a3b8" }}>No meetings scheduled yet.</div>
        )}
      </div>

      {modal?.type === "meeting" && (
        <QuickModal open title="Schedule meeting" subtitle="Real meeting record, saved to the department register" cta="Schedule meeting" fields={MEETING_FIELDS} values={form} onChange={(key, value) => setForm((f) => ({ ...f, [key]: value }))} onClose={() => setModal(null)} onSubmit={submit} />
      )}
      {modal?.type === "mom" && (
        <QuickModal open title="Minutes of meeting" subtitle="Saved against the meeting" cta="Save minutes" fields={MOM_FIELDS} values={form} onChange={(key, value) => setForm((f) => ({ ...f, [key]: value }))} onClose={() => setModal(null)} onSubmit={submit} />
      )}

      {toast && (
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: "#0f172a", color: "#ffffff", fontSize: 12.2, fontWeight: 500, borderRadius: 12, padding: "14px 22px", boxShadow: "0 16px 40px rgba(15,23,42,0.3)", zIndex: 120 }}>{toast}</div>
      )}
    </div>
  );
}
