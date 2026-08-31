"use client";

import { useMemo, useState } from "react";
import { useFacultyAcademicCalendar } from "@/modules/advisor/api/employee";
import { AcademicCalendarView } from "@/modules/shared/academic-calendar-view/AcademicCalendarView";

// Backed by GET /me/faculty-academic-calendar (MeFacultyAcademicCalendarController).

// Sundays and every 2nd/4th Saturday are non-working days institution-wide
// (same "structural day off, not a specific calendar row" convention as the
// student Attendance page treating every Sunday as a holiday even without a
// matching academic_calendar_events row) — shown here even when the office
// of academics hasn't also published an explicit holiday event for that date.
function isWeekendOff(date: Date): boolean {
  const dow = date.getDay();
  if (dow === 0) return true;
  if (dow === 6) {
    const occurrence = Math.ceil(date.getDate() / 7);
    return occurrence === 2 || occurrence === 4;
  }
  return false;
}

export default function AdvisorAcademicCalendarPage() {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const calendar = useFacultyAcademicCalendar();
  // event_type is nominally required but has shown up null on real rows —
  // normalized to "event" here so the shared view's type stays simple.
  const events = useMemo(
    () => (calendar.data?.events ?? []).map((e) => ({ ...e, event_type: e.event_type ?? "event" })),
    [calendar.data],
  );

  return (
    <div style={{ width: "100%" }}>
      <AcademicCalendarView
        subtitle={calendar.data?.semester ? `Semester ${calendar.data.semester} · published by the office of academics` : "Published by the office of academics"}
        events={events}
        isLoading={calendar.isLoading}
        isError={calendar.isError}
        viewYear={viewYear}
        viewMonth={viewMonth}
        onPrevMonth={() => {
          const d = new Date(viewYear, viewMonth - 1, 1);
          setViewYear(d.getFullYear());
          setViewMonth(d.getMonth());
        }}
        onNextMonth={() => {
          const d = new Date(viewYear, viewMonth + 1, 1);
          setViewYear(d.getFullYear());
          setViewMonth(d.getMonth());
        }}
        isSpecialDay={isWeekendOff}
        legend={[
          { label: "Published event", toneClassName: "border-border-accent bg-accent-50" },
          { label: "Weekend off (Sun · 2nd/4th Sat)", toneClassName: "border-danger-border bg-danger-bg" },
        ]}
      />
    </div>
  );
}
