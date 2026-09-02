"use client";

import { useMemo, useState } from "react";
import { useMyAttendance } from "@/modules/secretary/api/selfService";

// Pixel-exact layout port of the `isEmpAtt` screen from
// "Secretary Module - Web/Secretary Dashboard.dc.html", lines 755-812.
//
// REAL BACKEND WIRING — ZERO fake data. Reads via EOSbackend1's new
// `GET /me/faculty/my-attendance` (self-scoped by the real `staff_user_id`
// column added to `faculty_daily_attendance` by the Secretary module
// completion migration). Honest gap: this table has NO write endpoint
// anywhere in the app by design — it's populated externally via a
// biometric/punch import that hasn't been wired up yet for this account,
// so the calendar and punch list will correctly show empty/real data (not
// fabricated placeholder rows) until that import starts running.

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

interface Cell {
  key: string;
  day: string;
  blank: boolean;
  dim?: boolean;
  status?: string;
  plain?: boolean;
}

export default function SecretaryEmpAttendancePage() {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());

  const { data, isLoading, error } = useMyAttendance();

  function prev() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); } else setMonth((m) => m - 1);
  }
  function next() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); } else setMonth((m) => m + 1);
  }

  const byDate = useMemo(() => {
    const map = new Map<string, { status: string; punch_in: string | null; punch_out: string | null }>();
    for (const d of data?.days ?? []) map.set(d.date, d);
    return map;
  }, [data]);

  const cells = useMemo<Cell[]>(() => {
    const days = new Date(year, month + 1, 0).getDate();
    const first = new Date(year, month, 1).getDay();
    const out: Cell[] = [];
    for (let i = 0; i < first; i++) out.push({ key: `b${i}`, blank: true, day: "" });
    for (let d = 1; d <= days; d++) {
      const dow = new Date(year, month, d).getDay();
      const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const rec = byDate.get(iso);
      out.push({ key: `d${d}`, day: String(d), blank: false, dim: dow === 0 && !rec, status: rec?.status, plain: !rec });
    }
    return out;
  }, [month, year, byDate]);

  const recentPunches = (data?.days ?? []).slice(0, 6);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, marginBottom: 24, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 33.1, fontWeight: 700, letterSpacing: -1 }}>My Attendance</h1>
          <p style={{ margin: "8px 0 0", fontSize: 13.1, color: "#64748b" }}>Your own biometric log — real data, populated by the punch-in import</p>
        </div>
      </div>

      {isLoading && <div style={{ padding: 40, textAlign: "center", fontSize: 12.6, color: "#94a3b8" }}>Loading attendance…</div>}
      {error && <div style={{ padding: 40, textAlign: "center", fontSize: 12.6, color: "#b91c1c" }}>{error instanceof Error ? error.message : "Could not load attendance."}</div>}

      {data && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 20, marginBottom: 20 }}>
            {[
              { value: String(data.full_days), label: "FULL DAYS", fg: "#1d4ed8" },
              { value: String(data.absent), label: "ABSENT", fg: "#dc2626" },
              { value: String(data.on_duty + data.on_leave), label: "ON DUTY / LEAVE", fg: "#1d4ed8" },
              { value: `${data.attendance_percentage}%`, label: "OVERALL", fg: "#0f172a" },
            ].map((st) => (
              <div key={st.label} data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, padding: "26px 20px", textAlign: "center" }}>
                <div style={{ fontSize: 33.1, fontWeight: 700, letterSpacing: -1.2, color: st.fg }}>{st.value}</div>
                <div style={{ marginTop: 8, fontSize: 11.3, fontWeight: 600, letterSpacing: 0.9, color: "#94a3b8" }}>{st.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 22, alignItems: "start" }}>
            <div data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, padding: 22 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 20 }}>
                <button onClick={prev} style={{ width: 40, height: 40, borderRadius: 10, border: "1px solid #e5e9f2", background: "#ffffff", color: "#475569", fontSize: 15, cursor: "pointer" }}>‹</button>
                <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.4 }}>{MONTH_NAMES[month]} {year}</div>
                <button onClick={next} style={{ width: 40, height: 40, borderRadius: 10, border: "1px solid #e5e9f2", background: "#ffffff", color: "#475569", fontSize: 15, cursor: "pointer" }}>›</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 8, marginBottom: 8 }}>
                {WEEKDAYS.map((w, i) => <div key={i} style={{ textAlign: "center", fontSize: 12.2, fontWeight: 500, color: "#94a3b8" }}>{w}</div>)}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 8 }}>
                {cells.map((c) => {
                  if (c.blank) return <div key={c.key} />;
                  if (c.status === "absent") return <div key={c.key} style={{ height: 46, borderRadius: 10, background: "#fee2e2", color: "#b91c1c", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13.1, fontWeight: 700 }}>{c.day}</div>;
                  if (c.status) return <div key={c.key} style={{ height: 46, borderRadius: 10, background: "#dbeafe", color: "#1d4ed8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13.1, fontWeight: 700 }}>{c.day}</div>;
                  if (c.dim) return <div key={c.key} style={{ height: 46, borderRadius: 10, background: "#f1f5f9", color: "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13.1, fontWeight: 500 }}>{c.day}</div>;
                  return <div key={c.key} style={{ height: 46, borderRadius: 10, color: "#334155", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13.1, fontWeight: 500 }}>{c.day}</div>;
                })}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap", marginTop: 22, paddingTop: 18, borderTop: "1px solid #f1f5f9" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.2, color: "#475569" }}><span style={{ width: 14, height: 14, borderRadius: 4, border: "1px solid #e5e9f2", background: "#ffffff" }} />No record</span>
                <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.2, color: "#475569" }}><span style={{ width: 14, height: 14, borderRadius: 4, background: "#fecaca" }} />Absent</span>
                <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.2, color: "#475569" }}><span style={{ width: 14, height: 14, borderRadius: 4, background: "#dbeafe" }} />Present / On duty</span>
              </div>
            </div>
            <div data-sec-lift="" style={{ background: "#ffffff", border: "1px solid #e5e9f2", borderRadius: 14, padding: "22px 22px 6px" }}>
              <h2 style={{ margin: "0 0 14px", fontSize: 16.5, fontWeight: 700 }}>Recent punches</h2>
              {recentPunches.length === 0 && (
                <div style={{ padding: "20px 0 24px", fontSize: 12.2, color: "#94a3b8" }}>No punch records yet for this account — this fills in once the biometric import starts writing your attendance.</div>
              )}
              {recentPunches.map((p) => {
                const isAbsent = p.status === "absent";
                const chipBg = isAbsent ? "#fef2f7" : "#eef4ff";
                const chipFg = isAbsent ? "#b91c1c" : "#1d4ed8";
                return (
                  <div key={p.date} data-sec-row="" style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 0", borderBottom: "1px solid #f1f5f9" }}>
                    <span style={{ flex: "0 0 58px", fontSize: 12.2, fontWeight: 600, color: "#64748b" }}>{p.date.slice(5)}</span>
                    <div style={{ flex: "1 1 140px", minWidth: 140 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700 }}>{p.punch_in ? `${p.punch_in} in · ${p.punch_out ?? "—"} out` : "No punch recorded"}</div>
                      <div style={{ fontSize: 11.8, color: "#94a3b8", marginTop: 2 }}>{p.day}</div>
                    </div>
                    <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.7, borderRadius: 999, padding: "8px 14px", whiteSpace: "nowrap", background: chipBg, color: chipFg }}>{p.status.toUpperCase()}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
