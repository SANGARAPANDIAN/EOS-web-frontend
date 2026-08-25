"use client";

import { useState } from "react";
import { Modal } from "@/components/ui";
import { useCreateAward } from "@/modules/iqac/api/studentDevelopment";
import type { StudentRow } from "@/modules/iqac/api/students";
import { StudentPicker } from "./StudentPicker";

const LEVEL_OPTIONS = ["District", "Zonal", "State", "National", "International"];
const RESULT_OPTIONS = ["Awarded", "Winner", "Runner-up", "Participated"];

function todayDateInput(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Records a real sports_achievements row for one student. "Award" maps to
 * the real event_name column (locked to the current event when opened from
 * the event detail page); "Event" maps to the real, already-existing venue
 * column — the closest honest fit for "which specific occurrence this was
 * won at" (e.g. "ICACCS 2026") without inventing a new column.
 */
export function AddAwardEntryModal({
  onClose,
  onCreated,
  eventName,
}: {
  onClose: () => void;
  onCreated: () => void;
  eventName?: string;
}) {
  const create = useCreateAward();

  const [student, setStudent] = useState<StudentRow | null>(null);
  const [award, setAward] = useState(eventName ?? "");
  const [venue, setVenue] = useState("");
  const [level, setLevel] = useState(LEVEL_OPTIONS[0]);
  const [awardedOn, setAwardedOn] = useState(todayDateInput());
  const [result, setResult] = useState(RESULT_OPTIONS[0]);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!student || !award.trim()) {
      setError("Student and award are both required.");
      return;
    }
    setError(null);
    try {
      await create.mutateAsync({
        event_name: award.trim(),
        result,
        achievement_date: awardedOn,
        level,
        venue: venue.trim() || undefined,
        athlete_student_id: student.id,
      });
      onCreated();
      onClose();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Could not save this achievement.");
    }
  }

  return (
    <Modal open onClose={onClose} title="Add student entry" subtitle={`Award winners · ${eventName ?? (award || "Awards")}`}>
      <div className="flex flex-col gap-4">
        <StudentPicker selected={student} onSelect={setStudent} />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Award</div>
            {eventName ? (
              <div className="mt-1.5 h-11 flex items-center rounded-[11px] border border-border-default bg-surface-tint px-3.5 text-[13.5px] font-bold text-ink">{eventName}</div>
            ) : (
              <input
                value={award}
                onChange={(e) => setAward(e.target.value)}
                placeholder="e.g. Best Paper Award"
                className="mt-1.5 h-11 w-full rounded-[11px] border border-border-default px-3.5 text-[13.5px] outline-none focus:border-primary"
              />
            )}
          </div>
          <div>
            <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Event</div>
            <input
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="e.g. ICACCS 2026"
              className="mt-1.5 h-11 w-full rounded-[11px] border border-border-default px-3.5 text-[13.5px] outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Level</div>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-[11px] border border-border-default bg-surface px-3 text-[13.5px] outline-none focus:border-primary"
            >
              {LEVEL_OPTIONS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Awarded on</div>
            <input
              type="date"
              value={awardedOn}
              onChange={(e) => setAwardedOn(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-[11px] border border-border-default px-3.5 text-[13.5px] outline-none focus:border-primary"
            />
          </div>
        </div>

        <div>
          <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Faculty mentor</div>
          <div className="mt-1.5 h-11 flex items-center rounded-[11px] border border-border-default bg-surface-tint px-3.5 text-[13.5px] font-bold text-ink">
            {student?.mentor?.name ?? "Not assigned"}
          </div>
        </div>

        <div>
          <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Result</div>
          <select
            value={result}
            onChange={(e) => setResult(e.target.value)}
            className="mt-1.5 h-11 w-full rounded-[11px] border border-border-default bg-surface px-3 text-[13.5px] outline-none focus:border-primary"
          >
            {RESULT_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        {error && <div className="text-[13px] font-semibold text-danger-fg">{error}</div>}

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="h-[42px] rounded-[10px] border border-border-default bg-surface px-4 text-[13.5px] font-bold text-ink hover:bg-surface-tint">
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={create.isPending}
            className="h-[42px] rounded-[10px] border border-primary-border bg-primary px-4 text-[13.5px] font-bold text-white disabled:opacity-50"
          >
            {create.isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
