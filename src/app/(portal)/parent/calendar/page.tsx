"use client";

import { useState } from "react";
import { useSelectedChild } from "@/modules/parent/ChildContext";
import { ChildSwitcher } from "@/modules/parent/components/ChildSwitcher";
import { useChildAcademicCalendar } from "@/modules/parent/api/calendar";
import { academicYearLabel } from "@/lib/utils/date";
import { AcademicCalendarView } from "@/modules/shared/academic-calendar-view/AcademicCalendarView";

// The real schema only distinguishes `holiday` vs a generic `event` — see the
// student page's own copy of this same note for why the richer categories a
// design reference might use aren't real backing data here.
const EVENT_TYPE_LABEL: Record<string, string> = {
  holiday: "Holiday",
  event: "Instruction",
};

export default function ParentAcademicCalendarPage() {
  const { selectedChildId } = useSelectedChild();
  const academicCalendar = useChildAcademicCalendar(selectedChildId);
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const yearLabel = academicYearLabel(academicCalendar.data?.start_date ?? null, academicCalendar.data?.semester);

  return (
    <div className="flex flex-col gap-[18px] animate-pop-in">
      <div className="flex justify-end">
        <ChildSwitcher />
      </div>
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
