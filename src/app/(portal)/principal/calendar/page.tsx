"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { principalColors } from "@/modules/principal/theme";
import { useInitialQueryParam } from "@/lib/utils/useInitialQueryParam";
import { useBatches } from "@/modules/placement/api/refData";
import { useAcademicCalendarPeriods } from "@/modules/shared/academic-calendar/api";
import { CalendarPeriodView } from "@/modules/shared/academic-calendar/CalendarPeriodView";
import { CalendarEventModal } from "@/modules/shared/academic-calendar/CalendarEventModal";
import type { CalendarEventItem } from "@/modules/shared/academic-calendar/types";
import {
  usePersonalCalendarEntries,
  useAddPersonalEntry,
  useDeletePersonalEntry,
  type PersonalCalendarEntry,
} from "@/modules/principal/api/calendar";

/** Same June academic-year cutoff convention used on the Reports page. */
function currentAcademicYearLabel(): string {
  const now = new Date();
  const year = now.getFullYear();
  const start = now.getMonth() + 1 >= 6 ? year : year - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

const PERSONAL_CATEGORY_LABELS: Record<PersonalCalendarEntry["category"], string> = {
  personal: "Personal",
  reminder: "Reminder",
  meeting: "Meeting",
  task: "Task",
  deadline: "Deadline",
  follow_up: "Follow-up",
  note: "Note",
};

export default function PrincipalCalendarPage() {
  const batches = useBatches();
  const periods = useAcademicCalendarPeriods();

  const [batchId, setBatchId] = useState<number | "all">("all");
  const [semester, setSemester] = useState<number | "all">("all");
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEventItem | null>(null);
  const [newEventDate, setNewEventDate] = useState<string | undefined>(undefined);

  const now = new Date();
  const [noteYear, setNoteYear] = useState(now.getFullYear());
  const [noteMonth, setNoteMonth] = useState(now.getMonth() + 1);
  const [noteDay, setNoteDay] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteCategory, setNoteCategory] = useState<PersonalCalendarEntry["category"]>("meeting");
  const [noteComposerOpen, setNoteComposerOpen] = useState(false);

  const batchNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const b of batches.data ?? []) map.set(b.id, b.name);
    return map;
  }, [batches.data]);

  const filteredPeriods = useMemo(
    () => (periods.data ?? []).filter((p) => (batchId === "all" || p.batchId === batchId) && (semester === "all" || p.semester === semester)),
    [periods.data, batchId, semester],
  );
  const semesterOptions = useMemo(() => {
    const set = new Set((periods.data ?? []).filter((p) => batchId === "all" || p.batchId === batchId).map((p) => p.semester));
    return Array.from(set).sort((a, b) => a - b);
  }, [periods.data, batchId]);
  const selectedPeriod = useMemo(
    () => (filteredPeriods.length === 0 ? null : filteredPeriods.reduce((latest, p) => (p.endDate > latest.endDate ? p : latest), filteredPeriods[0])),
    [filteredPeriods],
  );

  function openAddEvent(date: string) {
    setEditingEvent(null);
    setNewEventDate(date);
    setEventModalOpen(true);
  }
  function openEditEvent(e: CalendarEventItem) {
    setEditingEvent(e);
    setNewEventDate(undefined);
    setEventModalOpen(true);
  }

  // Header "+" quick action lands here as /principal/calendar?action=add-event
  // — open the same real institution-event composer the page's own "+" cell
  // clicks use, once a period has resolved to add it against.
  const initialAction = useInitialQueryParam("action");
  useEffect(() => {
    if (initialAction === "add-event" && selectedPeriod) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      openAddEvent(new Date().toISOString().slice(0, 10));
    }
  }, [initialAction, selectedPeriod]);

  const personalEntries = usePersonalCalendarEntries(noteYear, noteMonth);
  const addPersonalEntry = useAddPersonalEntry();
  const deletePersonalEntry = useDeletePersonalEntry();
  const notes = useMemo(
    () => (personalEntries.data ?? []).slice().sort((a, b) => a.entry_date.localeCompare(b.entry_date)),
    [personalEntries.data],
  );

  async function handleAddNote() {
    const dayNum = Number(noteDay);
    if (!dayNum || dayNum < 1 || dayNum > 31 || !noteTitle.trim()) return;
    const entryDate = `${noteYear}-${String(noteMonth).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
    try {
      await addPersonalEntry.mutateAsync({ entry_date: entryDate, title: noteTitle.trim(), category: noteCategory });
      setNoteComposerOpen(false);
      setNoteDay("");
      setNoteTitle("");
      setNoteCategory("meeting");
    } catch {
      // error surfaced via addPersonalEntry.isError below
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1
            className="text-[34px] font-extrabold tracking-tight"
            style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}
          >
            Academic Calendar
          </h1>
          <p className="mt-1.5 text-[15px]" style={{ color: principalColors.textFaint }}>
            Academic year {currentAcademicYearLabel()} · institution events are visible to everyone · your own notes are
            only visible to you
          </p>
        </div>
        <div className="flex gap-2.5">
          <select
            value={batchId === "all" ? "all" : String(batchId)}
            onChange={(e) => {
              setBatchId(e.target.value === "all" ? "all" : Number(e.target.value));
              setSemester("all");
            }}
            className="h-10 rounded-lg border px-3 text-sm"
            style={{ borderColor: principalColors.border, color: principalColors.heading }}
          >
            <option value="all">All batches</option>
            {(batches.data ?? []).map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <select
            value={semester === "all" ? "all" : String(semester)}
            onChange={(e) => setSemester(e.target.value === "all" ? "all" : Number(e.target.value))}
            className="h-10 rounded-lg border px-3 text-sm"
            style={{ borderColor: principalColors.border, color: principalColors.heading }}
          >
            <option value="all">All semesters</option>
            {semesterOptions.map((s) => (
              <option key={s} value={s}>
                Semester {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {periods.isLoading ? (
        <p className="text-[13px]" style={{ color: principalColors.textFaint }}>
          Loading calendar…
        </p>
      ) : !selectedPeriod ? (
        <div className="rounded-2xl border p-8 text-center" style={{ background: principalColors.bg, borderColor: principalColors.border }}>
          <p className="text-[13px]" style={{ color: principalColors.textFaint }}>
            No academic calendar published for this batch/semester yet.
          </p>
        </div>
      ) : (
        <CalendarPeriodView
          key={selectedPeriod.id}
          period={selectedPeriod}
          batchName={batchNameById.get(selectedPeriod.batchId) ?? `Batch #${selectedPeriod.batchId}`}
          onAddEvent={openAddEvent}
          onEditEvent={openEditEvent}
        />
      )}

      {selectedPeriod && eventModalOpen && (
        <CalendarEventModal
          key={`event-${editingEvent?.id ?? newEventDate ?? "new"}`}
          open={eventModalOpen}
          onClose={() => setEventModalOpen(false)}
          academicCalendarId={selectedPeriod.id}
          defaultDate={newEventDate}
          event={editingEvent}
        />
      )}

      <div className="rounded-2xl border p-5" style={{ background: principalColors.bg, borderColor: principalColors.border }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[17px] font-bold" style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}>
              Your personal notes
            </div>
            <p className="mt-0.5 text-sm" style={{ color: principalColors.textFaint }}>
              Private reminders and to-dos — only visible to you, never published to the institution calendar
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={noteMonth}
              onChange={(e) => setNoteMonth(Number(e.target.value))}
              className="h-9 rounded-lg border px-2 text-sm"
              style={{ borderColor: principalColors.border, color: principalColors.heading }}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {new Date(2000, m - 1, 1).toLocaleDateString("en-US", { month: "long" })}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={noteYear}
              onChange={(e) => setNoteYear(Number(e.target.value))}
              className="h-9 w-20 rounded-lg border px-2 text-sm"
              style={{ borderColor: principalColors.border, color: principalColors.heading }}
            />
            <button
              type="button"
              onClick={() => setNoteComposerOpen(true)}
              className="flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-white"
              style={{ background: principalColors.primary }}
            >
              <Icon name="add" size={16} />
              Add a note
            </button>
          </div>
        </div>

        {noteComposerOpen && (
          <div className="mt-4 rounded-xl border p-4" style={{ borderColor: principalColors.chipBorder }}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[100px_1fr_160px]">
              <div>
                <label className="mb-1 block text-xs font-bold" style={{ color: principalColors.primary }}>
                  Day
                </label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={noteDay}
                  onChange={(e) => setNoteDay(e.target.value)}
                  className="h-10 w-full rounded-lg border px-2.5 text-sm outline-none"
                  style={{ borderColor: principalColors.border, color: principalColors.heading }}
                  placeholder="14"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold" style={{ color: principalColors.primary }}>
                  Note
                </label>
                <input
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  className="h-10 w-full rounded-lg border px-2.5 text-sm outline-none"
                  style={{ borderColor: principalColors.border, color: principalColors.heading }}
                  placeholder="e.g. Call the CSE HoD about placements"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold" style={{ color: principalColors.primary }}>
                  Category
                </label>
                <select
                  value={noteCategory}
                  onChange={(e) => setNoteCategory(e.target.value as PersonalCalendarEntry["category"])}
                  className="h-10 w-full rounded-lg border-2 px-2.5 text-sm font-semibold outline-none"
                  style={{ borderColor: principalColors.primary, color: principalColors.heading }}
                >
                  {Object.entries(PERSONAL_CATEGORY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {addPersonalEntry.isError && (
              <p className="mt-2 text-sm" style={{ color: "#B42318" }}>
                Could not add this note. Please try again.
              </p>
            )}
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={handleAddNote}
                disabled={addPersonalEntry.isPending || !noteDay || !noteTitle.trim()}
                className="flex h-9 items-center gap-2 rounded-lg px-3.5 text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: principalColors.primary }}
              >
                {addPersonalEntry.isPending ? "Adding…" : "Add note"}
              </button>
              <button
                type="button"
                onClick={() => setNoteComposerOpen(false)}
                className="h-9 rounded-lg border px-3.5 text-sm font-semibold"
                style={{ borderColor: principalColors.border, color: principalColors.body }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="mt-3 flex flex-col">
          {personalEntries.isLoading &&
            Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 border-t px-0.5 py-3" style={{ borderColor: principalColors.borderMuted }}>
                <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
                <Skeleton className="h-4 w-40" />
              </div>
            ))}
          {!personalEntries.isLoading && notes.length === 0 && (
            <p className="py-3 text-sm" style={{ color: principalColors.textFaint }}>
              No personal notes for this month.
            </p>
          )}
          {notes.map((n) => {
            const d = new Date(n.entry_date);
            return (
              <div
                key={n.id}
                className="flex items-center gap-3.5 border-t px-0.5 py-3 first:border-t-0"
                style={{ borderColor: principalColors.borderMuted }}
              >
                <div
                  className="flex size-11 shrink-0 flex-col items-center justify-center rounded-lg"
                  style={{ background: principalColors.surfaceTint }}
                >
                  <span className="text-sm font-bold" style={{ color: principalColors.heading }}>
                    {d.getUTCDate()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold" style={{ color: principalColors.heading }}>
                    {n.title}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-xs" style={{ color: principalColors.textFaint }}>
                    <Icon name="lock_person" size={12} />
                    {PERSONAL_CATEGORY_LABELS[n.category]} · only visible to you
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => deletePersonalEntry.mutate(n.id)}
                  className="shrink-0 rounded-lg p-1.5"
                  style={{ color: principalColors.textFaint }}
                  title="Delete this note"
                >
                  <Icon name="delete" size={16} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
