"use client";

import { useState } from "react";
import { Modal, Button, Input } from "@/components/ui";
import { useAddPersonalCalendarEntry } from "@/modules/student/api/personalCalendar";

interface AddPersonalNoteModalProps {
  /** "YYYY-MM-DD" of the day clicked on the calendar grid, or null when the modal is closed. */
  date: string | null;
  onClose: () => void;
}

/**
 * The whole point of this modal is that it opens already knowing which date
 * was clicked — no date picker, just a title. Deliberately simpler than the
 * institution CalendarEventModal (no type/start-time/end-time — a personal
 * note has none of that), matching how little the user actually asked for.
 *
 * The full-screen Modal backdrop makes clicking a different day cell
 * impossible while this is open, so `date` only ever transitions
 * null→value (opening fresh) or value→null (closing) — resetting on close
 * is enough, no effect needed to reset on open.
 */
export function AddPersonalNoteModal({ date, onClose }: AddPersonalNoteModalProps) {
  const [title, setTitle] = useState("");
  const addNote = useAddPersonalCalendarEntry();

  function handleClose() {
    setTitle("");
    addNote.reset();
    onClose();
  }

  function handleSave() {
    if (!date || !title.trim()) return;
    addNote.mutate(
      { entry_date: date, title: title.trim() },
      { onSuccess: handleClose },
    );
  }

  const formattedDate = date
    ? new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    : "";

  return (
    <Modal open={date != null} onClose={handleClose} title="Add a personal note" subtitle={formattedDate}>
      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-[13px] font-bold text-ink">Note</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Revise DBMS unit 3"
            maxLength={200}
          />
        </div>
        {addNote.isError && <p className="text-[12px] text-danger-fg">{(addNote.error as Error).message}</p>}
        <p className="text-[12px] text-subtle">Only visible to you — never shown to anyone else, never published to the institution calendar.</p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" className="w-auto" onClick={handleClose}>
            Cancel
          </Button>
          <Button className="w-auto" onClick={handleSave} disabled={!title.trim() || addNote.isPending}>
            {addNote.isPending ? "Saving…" : "Save note"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
