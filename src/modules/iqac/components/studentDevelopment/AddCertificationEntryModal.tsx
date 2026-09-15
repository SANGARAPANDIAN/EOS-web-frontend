"use client";

import { useState } from "react";
import { Modal } from "@/components/ui";
import { useAddCertificationEntry, useUpdateCertificationEntry, type CertificationRow } from "@/modules/iqac/api/studentDevelopment";
import type { StudentRow } from "@/modules/iqac/api/students";
import { StudentPicker } from "./StudentPicker";

const STATUS_OPTIONS: { value: "enrolled" | "in_progress" | "completed"; label: string }[] = [
  { value: "enrolled", label: "Enrolled" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
];

/** Records a real student_certificates row with certificate_type_id left null — a skill/course certification, not an admin document. */
export function AddCertificationEntryModal({
  onClose,
  onCreated,
  editing,
}: {
  onClose: () => void;
  onCreated: () => void;
  /** Editing an existing certification — the student can't be changed here (delete + re-add for that). */
  editing?: CertificationRow;
}) {
  const create = useAddCertificationEntry();
  const update = useUpdateCertificationEntry();
  const isEditing = editing != null;

  const [student, setStudent] = useState<StudentRow | null>(null);
  const [platform, setPlatform] = useState(editing?.platform ?? "");
  const [track, setTrack] = useState(editing?.track ?? "");
  const [score, setScore] = useState(editing?.score ?? "");
  const [completedOn, setCompletedOn] = useState(editing?.completed_on?.slice(0, 10) ?? "");
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]["value"]>((editing?.status as (typeof STATUS_OPTIONS)[number]["value"]) ?? "completed");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (isEditing) {
      setError(null);
      try {
        await update.mutateAsync({
          id: editing.id,
          input: { platform: platform.trim(), track: track.trim(), score: score.trim() || undefined, completed_on: completedOn || undefined, status },
        });
        onCreated();
        onClose();
      } catch (err: unknown) {
        setError((err as { message?: string })?.message ?? "Could not save this certification.");
      }
      return;
    }
    if (!student || !platform.trim() || !track.trim()) {
      setError("Student, platform and track are all required.");
      return;
    }
    setError(null);
    try {
      await create.mutateAsync({
        student_id: student.id,
        platform: platform.trim(),
        track: track.trim(),
        score: score.trim() || undefined,
        completed_on: completedOn || undefined,
        status,
      });
      onCreated();
      onClose();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Could not save this certification.");
    }
  }

  return (
    <Modal open onClose={onClose} title={isEditing ? "Edit student entry" : "Add student entry"} subtitle="Certifications · skill and course certifications">
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
            <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Platform</div>
            <input
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              placeholder="e.g. Coursera, NPTEL, AWS"
              className="mt-1.5 h-11 w-full rounded-[11px] border border-border-default px-3.5 text-[13.5px] outline-none focus:border-primary"
            />
          </div>
          <div>
            <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Track</div>
            <input
              value={track}
              onChange={(e) => setTrack(e.target.value)}
              placeholder="e.g. Machine Learning"
              className="mt-1.5 h-11 w-full rounded-[11px] border border-border-default px-3.5 text-[13.5px] outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Score (optional)</div>
            <input
              value={score}
              onChange={(e) => setScore(e.target.value)}
              placeholder="e.g. 92% or Grade A"
              className="mt-1.5 h-11 w-full rounded-[11px] border border-border-default px-3.5 text-[13.5px] outline-none focus:border-primary"
            />
          </div>
          <div>
            <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Completed on</div>
            <input
              type="date"
              value={completedOn}
              onChange={(e) => setCompletedOn(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-[11px] border border-border-default px-3.5 text-[13.5px] outline-none focus:border-primary"
            />
          </div>
        </div>

        <div>
          <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Status</div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            className="mt-1.5 h-11 w-full rounded-[11px] border border-border-default bg-surface px-3 text-[13.5px] outline-none focus:border-primary"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
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
