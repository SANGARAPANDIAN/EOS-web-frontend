"use client";

import { useState } from "react";
import { useMyAcademicCalendar } from "@/modules/student/api/profile";
import { academicYearLabel } from "@/lib/utils/date";
import { AcademicCalendarView } from "@/modules/shared/academic-calendar-view/AcademicCalendarView";

// The real schema only distinguishes `holiday` vs a generic `event` — the
// design reference's richer Examination/Placement/Institution/Finance tags
// have no backing column anywhere (calendar_event_type_enum is holiday|event
// only), so this sticks to the two real values rather than guessing a
// category from free-text titles.
const EVENT_TYPE_LABEL: Record<string, string> = {
  holiday: "Holiday",
  event: "Instruction",
};

export default function StudentAcademicCalendarPage() {
  const academicCalendar = useMyAcademicCalendar();
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const yearLabel = academicYearLabel(academicCalendar.data?.start_date ?? null, academicCalendar.data?.semester);

  return (
    <div className="animate-pop-in">
      <AcademicCalendarView
        subtitle={`${yearLabel ? `Academic year ${yearLabel} · ` : ""}published by the office of academics`}
        events={academicCalendar.data?.events ?? []}
        isLoading={academicCalendar.isLoading}
        isError={academicCalendar.isError}
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
        eventTypeLabel={(t) => EVENT_TYPE_LABEL[t] ?? t}
        legend={[
          { label: "Holiday", toneClassName: "border-border-accent bg-accent-50" },
          { label: "Instruction", toneClassName: "border-border-accent bg-accent-50" },
        ]}
      />
    </div>
  );
}
