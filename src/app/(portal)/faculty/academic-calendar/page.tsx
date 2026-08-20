"use client";

import { useMemo, useState } from "react";
import { useFacultyAcademicCalendar } from "@/modules/advisor/api/employee";

// Backed by GET /me/faculty-academic-calendar
// (MeFacultyAcademicCalendarController). Real events have no separate
// "day-of-week" field — derived client-side from event_date, same as the
// design's own dow label. `event_type` drives the tag pill.

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DOW = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function tagPill(tag: string | null | undefined) {
  const map: Record<string, { bg: string; border: string; color: string }> = {
    event: { bg: "#EFF6FF", border: "#DBEAFE", color: "#1D4ED8" },
    placement: { bg: "#EFF6FF", border: "#BFDBFE", color: "#1E3A8A" },
    holiday: { bg: "#FEF2F2", border: "#FECACA", color: "#DC2626" },
    exam: { bg: "#F1F5F9", border: "#CBD5E1", color: "#475569" },
  };
  const t = map[(tag ?? "event").toLowerCase()] ?? map.event;
  return { padding: "5px 12px", borderRadius: 20, background: t.bg, border: `1px solid ${t.border}`, color: t.color, fontSize: 11, fontWeight: 800 } as const;
}

export default function AdvisorAcademicCalendarPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());

  const calendar = useFacultyAcademicCalendar();
  const allEvents = calendar.data?.events ?? [];

  const eventsThisMonth = useMemo(
    () => allEvents.filter((e) => { const d = new Date(e.event_date); return d.getFullYear() === year && d.getMonth() === month; }).sort((a, b) => a.event_date.localeCompare(b.event_date)),
    [allEvents, year, month],
  );
  const eventDaySet = useMemo(() => new Set(eventsThisMonth.map((e) => new Date(e.event_date).getDate())), [eventsThisMonth]);

  const first = new Date(year, month, 1);
  const startOffset = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(startOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); } else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); } else setMonth((m) => m + 1);
  }

  return (
    <div style={{ width: "100%" }}>
      <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em" }}>Academic Calendar</div>
      <div style={{ marginTop: 6, fontSize: 14, color: "#64748B", fontWeight: 500 }}>
        {calendar.data?.semester ? `Semester ${calendar.data.semester}` : "Published by the office of academics"}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 20, alignItems: "start" }}>
        <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 22 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div onClick={prevMonth} style={{ width: 34, height: 34, borderRadius: 9, background: "#F1F5F9", color: "#1D4ED8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, cursor: "pointer" }}>
              ‹
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.02em" }}>
                {MONTHS[month]} {year}
              </div>
              <div style={{ fontSize: 12, color: "#94A3B8", fontWeight: 600, marginTop: 2 }}>{eventsThisMonth.length} events this month</div>
            </div>
            <div onClick={nextMonth} style={{ width: 34, height: 34, borderRadius: 9, background: "#F1F5F9", color: "#1D4ED8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, cursor: "pointer" }}>
              ›
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 7, marginTop: 20 }}>
            {WEEKDAYS.map((w, i) => (
              <div key={i} style={{ textAlign: "center", fontSize: 11, fontWeight: 800, color: "#94A3B8", paddingBottom: 6 }}>
                {w}
              </div>
            ))}
            {cells.map((d, i) => {
              const hasEvent = d !== null && eventDaySet.has(d);
              return (
                <div
                  key={i}
                  data-advisor-lift={d ? "" : undefined}
                  style={{
                    textAlign: "center",
                    padding: "9px 0",
                    borderRadius: 9,
                    fontSize: 13,
                    fontWeight: hasEvent ? 800 : 600,
                    color: d === null ? "transparent" : hasEvent ? "#1D4ED8" : "#334155",
                    background: hasEvent ? "#EFF6FF" : "transparent",
                    border: hasEvent ? "1px solid #DBEAFE" : "1px solid transparent",
                    cursor: d ? "pointer" : "default",
                  }}
                >
                  {d ?? "·"}
                </div>
              );
            })}
          </div>
        </div>

        <div data-advisor-lift="" style={{ background: "#fff", border: "1px solid #E6EAF0", borderRadius: 14, padding: 22 }}>
          <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.02em" }}>Events this month</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 14 }}>
            {eventsThisMonth.map((e) => {
              const d = new Date(e.event_date);
              return (
                <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 0", borderBottom: "1px solid #F4F6FA" }}>
                  <div style={{ width: 46, height: 46, borderRadius: 11, background: "#F8FAFC", border: "1px solid #EEF1F6", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: "0 0 46px" }}>
                    <div style={{ fontSize: 15, fontWeight: 800, lineHeight: 1 }}>{d.getDate()}</div>
                    <div style={{ fontSize: 9.5, fontWeight: 800, color: "#94A3B8", letterSpacing: "0.06em", marginTop: 2 }}>{DOW[d.getDay()]}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{e.title}</div>
                    <div style={{ fontSize: 11.5, color: "#94A3B8", fontWeight: 600, marginTop: 3 }}>{d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</div>
                  </div>
                  <div style={tagPill(e.event_type)}>{(e.event_type ?? "event").toUpperCase()}</div>
                </div>
              );
            })}
            {eventsThisMonth.length === 0 && !calendar.isLoading && (
              <div style={{ fontSize: 13.5, color: "#94A3B8", fontWeight: 600, padding: "12px 0" }}>No events this month.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
