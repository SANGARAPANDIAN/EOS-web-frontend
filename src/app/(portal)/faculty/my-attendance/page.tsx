"use client";

import { useState } from "react";
import { useMyStaffAttendance } from "@/modules/advisor/api/employee";
import { useMyFacultyProfile } from "@/modules/advisor/api/profile";

// Backed by GET /me/staff-attendance (MeStaffAttendanceService). Real
// response has no punch-in/punch-out times at all — just a per-day status
// map ('present'|'absent'|'onDuty'|'holiday'), so the design's "Recent
// punches" list (with clock times) has no backend source and is replaced
// with a plain recent-days status list instead of invented punch times.

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function pill(status: string) {
  const map: Record<string, { bg: string; border: string; color: string }> = {
    present: { bg: "#EFF6FF", border: "#DBEAFE", color: "#1D4ED8" },
    absent: { bg: "#FEF2F2", border: "#FECACA", color: "#DC2626" },
    onDuty: { bg: "#EFF6FF", border: "#BFDBFE", color: "#1E3A8A" },
    holiday: { bg: "#F1F5F9", border: "#CBD5E1", color: "#475569" },
  };
  const t = map[status] ?? map.present;
  return { padding: "5px 12px", borderRadius: 20, background: t.bg, border: `1px solid ${t.border}`, color: t.color, fontSize: 11, fontWeight: 800 } as const;
}

const statusLabel: Record<string, string> = { present: "Present", absent: "Absent", onDuty: "On duty", holiday: "Holiday" };

export default function AdvisorMyAttendancePage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());

  const myProfile = useMyFacultyProfile();
  const attendance = useMyStaffAttendance(year, month + 1);
  const marks = attendance.data?.marks ?? {};
  const stats = attendance.data?.stats;

  const first = new Date(year, month, 1);
  const startOffset = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(startOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  function dateKey(d: number) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  function prevMonth() {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  }

  const recentDays = Object.entries(marks)
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .slice(0, 8);

  return (
    <div style={{ width: "100%" }}>
      <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em" }}>My Attendance</div>
      <div style={{ marginTop: 6, fontSize: 14, color: "#64748B", fontWeight: 500 }}>
        {myProfile.data?.name ?? ""}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 16, marginTop: 20 }}>
        <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 20, textAlign: "center" }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#1D4ED8" }}>{stats?.present ?? "—"}</div>
          <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.1em", color: "#7C8899", marginTop: 4 }}>PRESENT</div>
        </div>
        <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 20, textAlign: "center" }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#DC2626" }}>{stats?.absent ?? "—"}</div>
          <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.1em", color: "#7C8899", marginTop: 4 }}>ABSENT</div>
        </div>
        <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 20, textAlign: "center" }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#1D4ED8" }}>{stats?.onDuty ?? "—"}</div>
          <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.1em", color: "#7C8899", marginTop: 4 }}>ON DUTY</div>
        </div>
        <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 20, textAlign: "center" }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#0F172A" }}>{stats ? `${stats.overallPercent}%` : "—"}</div>
          <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.1em", color: "#7C8899", marginTop: 4 }}>OVERALL</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.35fr 1fr", gap: 16, marginTop: 16, alignItems: "start" }}>
        <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 22 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div onClick={prevMonth} style={{ width: 34, height: 34, borderRadius: 9, background: "#F1F5F9", color: "#1D4ED8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, cursor: "pointer" }}>
              ‹
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.02em" }}>
              {MONTHS[month]} {year}
            </div>
            <div onClick={nextMonth} style={{ width: 34, height: 34, borderRadius: 9, background: "#F1F5F9", color: "#1D4ED8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, cursor: "pointer" }}>
              ›
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginTop: 20 }}>
            {WEEKDAYS.map((w, i) => (
              <div key={i} style={{ textAlign: "center", fontSize: 11, fontWeight: 800, color: "#94A3B8", paddingBottom: 6 }}>
                {w}
              </div>
            ))}
            {cells.map((d, i) => {
              const status = d !== null ? marks[dateKey(d)] : undefined;
              const absent = status === "absent";
              const od = status === "onDuty";
              const holiday = status === "holiday";
              return (
                <div
                  key={i}
                  data-advisor-lift={d ? "" : undefined}
                  style={{
                    textAlign: "center",
                    padding: "9px 0",
                    borderRadius: 9,
                    fontSize: 13,
                    fontWeight: absent || od || holiday ? 800 : 600,
                    color: d === null ? "transparent" : absent ? "#DC2626" : od ? "#1E3A8A" : holiday ? "#475569" : "#334155",
                    background: absent ? "#FEF2F2" : od ? "#EFF6FF" : holiday ? "#F1F5F9" : "transparent",
                    border: absent ? "1px solid #FECACA" : od ? "1px solid #DBEAFE" : holiday ? "1px solid #CBD5E1" : "1px solid transparent",
                  }}
                >
                  {d ?? "·"}
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 18, marginTop: 20, paddingTop: 16, borderTop: "1px solid #F1F4F9", flexWrap: "wrap" }}>
            {[
              { swatch: "transparent", border: "#DDE3EC", label: "Present" },
              { swatch: "#FEF2F2", border: "#FECACA", label: "Absent" },
              { swatch: "#EFF6FF", border: "#DBEAFE", label: "On duty" },
              { swatch: "#F1F5F9", border: "#CBD5E1", label: "Holiday" },
            ].map((l) => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 12, height: 12, borderRadius: 4, background: l.swatch, border: `1px solid ${l.border}` }} />
                <div style={{ fontSize: 12.5, fontWeight: 600, color: "#475569" }}>{l.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 22 }}>
          <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.02em" }}>Recent days</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 14 }}>
            {recentDays.map(([date, status]) => (
              <div key={date} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 0", borderBottom: "1px solid #F4F6FA" }}>
                <div style={{ flex: 1, fontSize: 13.5, fontWeight: 700 }}>
                  {new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                </div>
                <div style={pill(status)}>{statusLabel[status] ?? status}</div>
              </div>
            ))}
            {recentDays.length === 0 && !attendance.isLoading && (
              <div style={{ fontSize: 13, color: "#94A3B8", fontWeight: 600, padding: "12px 0" }}>No attendance marked this month.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
