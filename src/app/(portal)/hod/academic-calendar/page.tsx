"use client";

import { useState } from "react";
import { useHodAcademicCalendarMonth } from "@/modules/hod/api/academicCalendar";
import { AcademicCalendarView } from "@/modules/shared/academic-calendar-view/AcademicCalendarView";
import { usePersonalCalendarEntries, useDeletePersonalCalendarEntry } from "@/modules/shared/api/personalCalendar";
import { AddPersonalNoteModal } from "@/modules/shared/components/AddPersonalNoteModal";

export default function HodAcademicCalendarPage() {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth()); // 0-indexed
  const calendar = useHodAcademicCalendarMonth(viewYear, viewMonth + 1);

  const personalNotes = usePersonalCalendarEntries();
  const deleteNote = useDeletePersonalCalendarEntry();
  const [addNoteDate, setAddNoteDate] = useState<string | null>(null);

  return (
    <div className="animate-pop-in">
      <AcademicCalendarView
        subtitle={`Academic year ${viewYear}-${String(viewYear + 1).slice(2)} · published by the office of academics`}
        events={calendar.data?.events ?? []}
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
        legend={[{ label: "Your personal notes", toneClassName: "border-personal-border bg-personal-bg" }]}
        personalEvents={personalNotes.data ?? []}
        onDayClick={(iso) => setAddNoteDate(iso)}
        onDeletePersonalNote={(note) => deleteNote.mutate(Number(note.id))}
      />
      <AddPersonalNoteModal date={addNoteDate} onClose={() => setAddNoteDate(null)} />
    </div>
  );
}
