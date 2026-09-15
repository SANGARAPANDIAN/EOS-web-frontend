"use client";

import { useState } from "react";
import { Modal } from "@/components/ui";
import { useAddHackathonEntry, useUpdateHackathonEntry, type HackathonRow } from "@/modules/iqac/api/studentDevelopment";
import type { StudentRow } from "@/modules/iqac/api/students";
import { StudentPicker } from "./StudentPicker";

/** Records a real student_hackathon_participations row for one student. */
export function AddHackathonEntryModal({
  onClose,
  onCreated,
  editing,
}: {
  onClose: () => void;
  onCreated: () => void;
  /** Editing an existing entry — the student can't be changed here (delete + re-add for that). */
  editing?: HackathonRow;
}) {
  const create = useAddHackathonEntry();
  const update = useUpdateHackathonEntry();
  const isEditing = editing != null;

  const [student, setStudent] = useState<StudentRow | null>(null);
  const [hackathonName, setHackathonName] = useState(editing?.hackathon_name ?? "");
  const [teamName, setTeamName] = useState(editing?.team_name ?? "");
  const [host, setHost] = useState(editing?.host ?? "");
  const [heldOn, setHeldOn] = useState(editing?.held_on?.slice(0, 10) ?? "");
  const [outcome, setOutcome] = useState(editing?.outcome ?? "");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (isEditing) {
      setError(null);
      try {
        await update.mutateAsync({
          id: editing.id,
          input: { hackathon_name: hackathonName.trim(), team_name: teamName.trim() || undefined, host: host.trim() || undefined, held_on: heldOn || undefined, outcome: outcome.trim() || undefined },
        });
        onCreated();
        onClose();
      } catch (err: unknown) {
        setError((err as { message?: string })?.message ?? "Could not save this hackathon entry.");
      }
      return;
    }
    if (!student || !hackathonName.trim()) {
      setError("Student and hackathon are both required.");
      return;
    }
    setError(null);
    try {
      await create.mutateAsync({
        student_id: student.id,
        hackathon_name: hackathonName.trim(),
        team_name: teamName.trim() || undefined,
        host: host.trim() || undefined,
        held_on: heldOn || undefined,
        outcome: outcome.trim() || undefined,
      });
      onCreated();
      onClose();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Could not save this hackathon entry.");
    }
  }

  return (
    <Modal open onClose={onClose} title={isEditing ? "Edit student entry" : "Add student entry"} subtitle="Hackathons · participation record">
      <div className="flex flex-col gap-4">
        {isEditing ? (
          <div>
            <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Student</div>
            <div className="mt-1.5 h-11 flex items-center rounded-[11px] border border-border-default bg-surface-tint px-3.5 text-[13.5px] font-bold text-ink">{editing.student.name}</div>
          </div>
        ) : (
          <StudentPicker selected={student} onSelect={setStudent} />
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Hackathon</div>
            <input
              value={hackathonName}
              onChange={(e) => setHackathonName(e.target.value)}
              placeholder="e.g. Smart India Hackathon"
              className="mt-1.5 h-11 w-full rounded-[11px] border border-border-default px-3.5 text-[13.5px] outline-none focus:border-primary"
            />
          </div>
          <div>
            <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Team name (optional)</div>
            <input
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="e.g. Team Alpha"
              className="mt-1.5 h-11 w-full rounded-[11px] border border-border-default px-3.5 text-[13.5px] outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Host (optional)</div>
            <input
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="e.g. AICTE"
              className="mt-1.5 h-11 w-full rounded-[11px] border border-border-default px-3.5 text-[13.5px] outline-none focus:border-primary"
            />
          </div>
          <div>
            <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Held on</div>
            <input
              type="date"
              value={heldOn}
              onChange={(e) => setHeldOn(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-[11px] border border-border-default px-3.5 text-[13.5px] outline-none focus:border-primary"
            />
          </div>
        </div>

        <div>
          <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Outcome (optional)</div>
          <input
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            placeholder="e.g. Finalist, Winner"
            className="mt-1.5 h-11 w-full rounded-[11px] border border-border-default px-3.5 text-[13.5px] outline-none focus:border-primary"
          />
        </div>

        {error && <div className="text-[13px] font-semibold text-danger-fg">{error}</div>}

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="h-[42px] rounded-[10px] border border-border-default bg-surface px-4 text-[13.5px] font-bold text-ink hover:bg-surface-tint">
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={create.isPending || update.isPending}
            className="h-[42px] rounded-[10px] border border-primary-border bg-primary px-4 text-[13.5px] font-bold text-white disabled:opacity-50"
          >
            {create.isPending || update.isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
