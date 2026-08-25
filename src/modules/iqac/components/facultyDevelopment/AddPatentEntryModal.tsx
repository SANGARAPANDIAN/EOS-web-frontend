"use client";

import { useState } from "react";
import { Modal } from "@/components/ui";
import { useAddPatentEntry } from "@/modules/iqac/api/facultyDevelopment";
import type { FacultyRow } from "@/modules/iqac/api/faculty";
import { FacultyPicker } from "./FacultyPicker";

const STAGE_OPTIONS: { value: "filed" | "published" | "granted"; label: string }[] = [
  { value: "filed", label: "Filed" },
  { value: "published", label: "Published" },
  { value: "granted", label: "Granted" },
];
const ROLE_OPTIONS = ["Inventor", "Co-inventor"];

function currentYear(): number {
  return new Date().getUTCFullYear();
}

/** Records a real faculty_patent_inventors row, finding or creating the real faculty_patents row by title. */
export function AddPatentEntryModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const addEntry = useAddPatentEntry();

  const [faculty, setFaculty] = useState<FacultyRow | null>(null);
  const [title, setTitle] = useState("");
  const [stage, setStage] = useState<(typeof STAGE_OPTIONS)[number]["value"]>("filed");
  const [filedYear, setFiledYear] = useState(String(currentYear()));
  const [stageDate, setStageDate] = useState("");
  const [role, setRole] = useState(ROLE_OPTIONS[0]);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!faculty || !title.trim()) {
      setError("Faculty and patent title are both required.");
      return;
    }
    setError(null);
    try {
      await addEntry.mutateAsync({
        faculty_id: faculty.id,
        title: title.trim(),
        stage,
        filed_year: filedYear.trim() ? Number(filedYear) : undefined,
        stage_date: stageDate || undefined,
        role,
      });
      onCreated();
      onClose();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Could not save this entry.");
    }
  }

  return (
    <Modal open onClose={onClose} title="Add faculty entry" subtitle="Patents">
      <div className="flex flex-col gap-4">
        <FacultyPicker selected={faculty} onSelect={setFaculty} />

        <div>
          <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Patent title</div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. A Method for Real-Time Traffic Prediction"
            className="mt-1.5 h-11 w-full rounded-[11px] border border-border-default px-3.5 text-[13.5px] outline-none focus:border-primary"
          />
          <p className="mt-1 text-[11px] text-subtle">Matches an existing patent by this exact title, or creates one.</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Stage</div>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value as typeof stage)}
              className="mt-1.5 h-11 w-full rounded-[11px] border border-border-default bg-surface px-3 text-[13.5px] outline-none focus:border-primary"
            >
              {STAGE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Filed year</div>
            <input
              value={filedYear}
              onChange={(e) => setFiledYear(e.target.value.replace(/\D/g, ""))}
              placeholder="e.g. 2026"
              className="mt-1.5 h-11 w-full rounded-[11px] border border-border-default px-3.5 text-[13.5px] outline-none focus:border-primary"
            />
          </div>
          <div>
            <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Stage date</div>
            <input
              type="date"
              value={stageDate}
              onChange={(e) => setStageDate(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-[11px] border border-border-default px-3.5 text-[13.5px] outline-none focus:border-primary"
            />
          </div>
        </div>

        <div>
          <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Inventor role</div>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="mt-1.5 h-11 w-full rounded-[11px] border border-border-default bg-surface px-3 text-[13.5px] outline-none focus:border-primary"
          >
            {ROLE_OPTIONS.map((r) => (
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
