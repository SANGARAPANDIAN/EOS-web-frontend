"use client";

import { useState } from "react";
import { Modal } from "@/components/ui";
import { useAddCompetitionEntry } from "@/modules/iqac/api/studentDevelopment";
import type { StudentRow } from "@/modules/iqac/api/students";
import { StudentPicker } from "./StudentPicker";

const LEVEL_OPTIONS = ["College", "District", "Zonal", "State", "National", "International"];

/** Records a real student_competitions row for one student. */
export function AddCompetitionEntryModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const addEntry = useAddCompetitionEntry();

  const [student, setStudent] = useState<StudentRow | null>(null);
  const [eventName, setEventName] = useState("");
  const [category, setCategory] = useState("");
  const [level, setLevel] = useState(LEVEL_OPTIONS[0]);
  const [heldOn, setHeldOn] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!student || !eventName.trim()) {
      setError("Student and event are both required.");
      return;
    }
    setError(null);
    try {
      await addEntry.mutateAsync({
        student_id: student.id,
        event_name: eventName.trim(),
        category: category.trim() || undefined,
        level,
        held_on: heldOn || undefined,
        result: result.trim() || undefined,
      });
      onCreated();
      onClose();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Could not save this competition entry.");
    }
  }

  return (
    <Modal open onClose={onClose} title="Add student entry" subtitle="Competitions · non-sports events">
      <div className="flex flex-col gap-4">
        <StudentPicker selected={student} onSelect={setStudent} />

        <div>
          <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Event</div>
          <input
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            placeholder="e.g. Hack The Code"
            className="mt-1.5 h-11 w-full rounded-[11px] border border-border-default px-3.5 text-[13.5px] outline-none focus:border-primary"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Category (optional)</div>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Coding, Quiz, Debate"
              className="mt-1.5 h-11 w-full rounded-[11px] border border-border-default px-3.5 text-[13.5px] outline-none focus:border-primary"
            />
          </div>
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
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Held on</div>
            <input
              type="date"
              value={heldOn}
              onChange={(e) => setHeldOn(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-[11px] border border-border-default px-3.5 text-[13.5px] outline-none focus:border-primary"
            />
          </div>
          <div>
            <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Result (optional)</div>
            <input
              value={result}
              onChange={(e) => setResult(e.target.value)}
              placeholder="e.g. Winner, Runner-up"
              className="mt-1.5 h-11 w-full rounded-[11px] border border-border-default px-3.5 text-[13.5px] outline-none focus:border-primary"
            />
          </div>
        </div>

        {error && <div className="text-[13px] font-semibold text-danger-fg">{error}</div>}

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="h-[42px] rounded-[10px] border border-border-default bg-surface px-4 text-[13.5px] font-bold text-ink hover:bg-surface-tint">
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={addEntry.isPending}
            className="h-[42px] rounded-[10px] border border-primary-border bg-primary px-4 text-[13.5px] font-bold text-white disabled:opacity-50"
          >
            {addEntry.isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
