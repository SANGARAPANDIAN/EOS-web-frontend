"use client";

import { useState } from "react";
import { useMyPreferences, useUpdateMyPreferences, type UserPreferences } from "@/modules/secretary/api/preferences";

// Pixel-exact layout port of the `isSettings` screen from
// "Secretary Module - Web/Secretary Dashboard.dc.html", lines 1520-1538.
//
// REAL BACKEND WIRING — ZERO fake data. Reads/writes through EOSbackend1's
// new `/me/preferences` module (built this session against the real
// `user_preferences` table added via the Secretary module completion
// migration). Self-scoped to the logged-in secretary's own account.

const SETTING_KEYS: { key: keyof Omit<UserPreferences, "user_id" | "updated_at">; label: string; desc: string }[] = [
  { key: "daily_attendance_digest", label: "Daily attendance digest", desc: "Email the section-wise summary at 5.00 pm." },
  { key: "sop_escalation_alerts", label: "SOP escalation alerts", desc: "Notify when a request crosses 7 days." },
  { key: "auto_circulate_mom", label: "Auto-circulate MoM", desc: "Send minutes to invitees once recorded." },
  { key: "compact_tables", label: "Compact tables", desc: "Reduce row height across list views." },
];

export default function SecretarySettingsPage() {
  const { data: prefs, isLoading, error } = useMyPreferences();
  const updateMutation = useUpdateMyPreferences();
  const [toast, setToast] = useState("");

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  }

  async function onToggle(key: (typeof SETTING_KEYS)[number]["key"], label: string) {
    if (!prefs) return;
    const nextValue = !prefs[key];
    try {
      await updateMutation.mutateAsync({ [key]: nextValue });
      flash(`${label} turned ${nextValue ? "on" : "off"}.`);
    } catch (err) {
      flash(err instanceof Error ? err.message : "Could not update the setting.");
    }
  }

  return (
    <div>
      <h1 style={{ margin: 0, fontSize: 33.1, fontWeight: 700, letterSpacing: -1 }}>Settings</h1>
      <p style={{ margin: "8px 0 26px", fontSize: 13.1, color: "#64748b" }}>Desk preferences for the department secretary account</p>

      {isLoading && <div style={{ padding: 40, fontSize: 12.6, color: "#94a3b8" }}>Loading preferences…</div>}
      {error && <div style={{ padding: 40, fontSize: 12.6, color: "#b91c1c" }}>{error instanceof Error ? error.message : "Could not load preferences."}</div>}

      {prefs && (
        <div data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, overflow: "hidden", maxWidth: 720 }}>
          {SETTING_KEYS.map((s) => {
            const on = prefs[s.key];
            return (
              <div key={s.key} data-sec-row="" style={{ display: "flex", alignItems: "center", gap: 16, padding: "18px 20px", borderBottom: "1px solid #f5f7fa" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.1, fontWeight: 600 }}>{s.label}</div>
                  <div style={{ fontSize: 11.3, color: "#64748b", marginTop: 2 }}>{s.desc}</div>
                </div>
                <button onClick={() => onToggle(s.key, s.label)} style={{ width: 54, height: 30, borderRadius: 999, border: 0, cursor: "pointer", position: "relative", background: on ? "#1e3a8a" : "#e2e8f0" }}>
                  <span style={{ position: "absolute", top: 3, left: on ? 27 : 3, width: 24, height: 24, borderRadius: 999, background: "#ffffff", boxShadow: "0 1px 3px rgba(15,23,42,0.25)", transition: "left 140ms ease" }} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {toast && (
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: "#0f172a", color: "#ffffff", fontSize: 12.2, fontWeight: 500, borderRadius: 12, padding: "14px 22px", boxShadow: "0 16px 40px rgba(15,23,42,0.3)", zIndex: 120 }}>{toast}</div>
      )}
    </div>
  );
}
