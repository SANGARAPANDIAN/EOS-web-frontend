"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Button, Input, Select } from "@/components/ui";
import { useInstitutionAcademicCalendar, useCreateCalendarEvent } from "@/modules/higher-education/api/calendar";
import { AcademicCalendarView } from "@/modules/shared/academic-calendar-view/AcademicCalendarView";

const EVENT_TYPE_LABEL: Record<string, string> = {
  holiday: "Holiday",
  event: "Event",
  instruction: "Instruction",
  assessment: "Assessment",
  placement: "Placement",
  institution: "Institution",
};

const CATEGORY_OPTIONS = ["Instruction", "Test", "Holiday", "Records", "Counselling", "Applications", "Funding", "Institution"];

function AddCalendarEventModal({ onClose }: { onClose: () => void }) {
  const createEvent = useCreateCalendarEvent();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState(CATEGORY_OPTIONS[0]);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!title.trim() || !date) {
      setError("Event and date are required.");
      return;
    }
    setError(null);
    try {
      await createEvent.mutateAsync({ title: title.trim(), event_date: date, category });
      onClose();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Could not save this event.");
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/45 p-14">
      <div className="w-full max-w-[560px] rounded-modal bg-surface">
        <div className="flex items-start justify-between gap-5 border-b border-divider px-[26px] py-[22px]">
          <div>
            <div className="text-[19px] font-extrabold text-ink">Add calendar event</div>
            <div className="mt-1 text-[13px] text-muted">Fields left blank stay unrecorded and can be filled later.</div>
          </div>
          <button type="button" onClick={onClose} className="flex size-[34px] shrink-0 items-center justify-center rounded-[9px] border border-border-default text-[16px] text-body">
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 px-[26px] py-[22px]">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Event</label>
            <Input className="mt-1.5" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Date</label>
            <Input className="mt-1.5" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Category</label>
            <Select className="mt-1.5" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
          {error && <div className="col-span-2 text-[13px] font-semibold text-danger-fg">{error}</div>}
        </div>

        <div className="flex justify-end gap-2.5 border-t border-divider px-[26px] py-[18px]">
          <Button variant="secondary" className="w-auto" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primarySmall" onClick={submit} disabled={createEvent.isPending}>
            Save event
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function HigherEducationCalendarPage() {
  const calendar = useInstitutionAcademicCalendar();
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="animate-pop-in">
      <AcademicCalendarView
        subtitle="Every batch's calendar merged with the cell's own events · you can add new events."
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
        weekStart="monday"
        eventTypeLabel={(t) => EVENT_TYPE_LABEL[t] ?? t}
        headerAction={
          <Button variant="primarySmall" className="w-auto" onClick={() => setShowAdd(true)}>
            Add event
          </Button>
        }
      />

      {showAdd && <AddCalendarEventModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}
