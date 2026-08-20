"use client";

import { useState } from "react";
import { ACTIVITIES } from "@/modules/secretary/fakeData";
import { tone, nextOf } from "@/modules/secretary/helpers";
import { QuickModal, type QuickFieldSpec } from "@/modules/secretary/QuickModal";

// Pixel-exact port of the `isActivity` screen from
// "Secretary Module - Web/Secretary Dashboard.dc.html", lines 638-676
// (row logic lines 3432-3441). Fake data + local-state interactivity.

const CYCLE = ["Scheduled", "In progress", "Completed"];

interface Activity {
  id: number;
  title: string;
  day: string;
  month: string;
  meta: string;
  status: string;
  progress: number;
}

const ACTIVITY_FIELDS: QuickFieldSpec[] = [
  { key: "title", label: "Activity title", type: "text", placeholder: "e.g. Model practical examination" },
  { key: "date", label: "Date (DD Mon)", type: "text" },
  { key: "scope", label: "Scope", type: "select", options: ["I year", "II year", "III year", "IV year", "All years"] },
  { key: "notes", label: "Detail", type: "area" },
];

export default function SecretaryActivityPage() {
  const [activities, setActivities] = useState<Activity[]>(ACTIVITIES);
  const [toast, setToast] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  }

  function openCreate() {
    setForm({ title: "", date: "22 Aug", scope: "III year", notes: "" });
    setModalOpen(true);
  }
  function submit() {
    if (!form.title?.trim()) {
      flash("Please fill in the title before saving.");
      return;
    }
    const p = String(form.date).split(" ");
    const created: Activity = { id: Date.now() % 100000, title: form.title, day: p[0] || "22", month: p[1] || "Aug", meta: form.scope + (form.notes ? ` · ${form.notes}` : ""), status: "Scheduled", progress: 5 };
    setActivities((prev) => [created, ...prev]);
    setModalOpen(false);
    flash("Academic activity added.");
  }
  function onAdvance(a: Activity) {
    const nx = a.status === "Completed" ? "In progress" : nextOf(CYCLE, a.status);
    setActivities((prev) => prev.map((r) => (r.id === a.id ? { ...r, status: nx, progress: nx === "Completed" ? 100 : nx === "In progress" ? Math.max(45, a.progress) : 10 } : r)));
    flash(`${a.title} → ${nx}`);
  }
  function onDelete(a: Activity) {
    setActivities((prev) => prev.filter((r) => r.id !== a.id));
    flash("Activity removed.");
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, marginBottom: 26 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 33.1, fontWeight: 700, letterSpacing: -1 }}>Academic Activity Management</h1>
          <p style={{ margin: "8px 0 0", fontSize: 13.1, color: "#64748b" }}>Coursework, assessments and lab schedules the department runs this semester</p>
        </div>
        <button onClick={openCreate} style={{ border: 0, background: "#1e3a8a", color: "#ffffff", fontSize: 13.1, fontWeight: 600, borderRadius: 12, padding: "15px 24px", cursor: "pointer" }}>＋ Add activity</button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {activities.map((a) => {
          const t = tone(a.status);
          const nextLabel = a.status === "Completed" ? "Reopen" : `→ ${nextOf(CYCLE, a.status)}`;
          return (
            <div key={a.id} data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, padding: "18px 20px", display: "flex", alignItems: "center", gap: 18 }}>
              <div style={{ width: 62, textAlign: "center", borderRight: "1px solid #eef2f7", paddingRight: 16 }}>
                <div style={{ fontSize: 19.1, fontWeight: 700, letterSpacing: -0.5 }}>{a.day}</div>
                <div style={{ fontSize: 10.8, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase" }}>{a.month}</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 13.9, fontWeight: 600 }}>{a.title}</span>
                  <span style={{ fontSize: 10.8, fontWeight: 600, borderRadius: 999, padding: "4px 10px", background: t.bg, color: t.fg }}>{a.status}</span>
                </div>
                <div style={{ fontSize: 11.3, color: "#64748b", marginTop: 4 }}>{a.meta}</div>
                <div style={{ height: 6, borderRadius: 999, background: "#eef2f7", marginTop: 12, overflow: "hidden", maxWidth: 420 }}>
                  <div style={{ height: "100%", background: "#1e3a8a", borderRadius: 999, width: `${a.progress}%` }} />
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 15.7, fontWeight: 700 }}>{a.progress}%</div>
                <div style={{ fontSize: 11.3, color: "#94a3b8" }}>completion</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span data-sec-soft="" onClick={() => onAdvance(a)} style={{ border: "1px solid #dbe6ff", background: "#ffffff", color: "#1e3a8a", fontSize: 11.8, fontWeight: 600, borderRadius: 8, padding: "8px 14px", cursor: "pointer" }}>{nextLabel}</span>
                <span data-sec-nav-item="" onClick={() => onDelete(a)} style={{ border: "1px solid #e5e9f2", background: "#ffffff", color: "#475569", fontSize: 11.8, fontWeight: 600, borderRadius: 8, padding: "8px 14px", cursor: "pointer" }}>Remove</span>
              </div>
            </div>
          );
        })}
      </div>

      <QuickModal
        open={modalOpen}
        title="Add academic activity"
        subtitle="Appears on the department academic plan"
        cta="Add activity"
        fields={ACTIVITY_FIELDS}
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
