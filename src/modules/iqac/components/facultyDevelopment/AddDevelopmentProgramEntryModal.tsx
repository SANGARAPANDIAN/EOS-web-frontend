"use client";

import { useState } from "react";
import { Modal } from "@/components/ui";
import { useAddFdpEntry, useAddSttpEntry } from "@/modules/iqac/api/facultyDevelopment";
import type { FacultyRow } from "@/modules/iqac/api/faculty";
import { FacultyPicker } from "./FacultyPicker";

const STATUS_OPTIONS: { value: "registered" | "attended" | "completed"; label: string }[] = [
  { value: "registered", label: "Registered" },
  { value: "attended", label: "Attended" },
  { value: "completed", label: "Completed" },
];

/** Records a real faculty_development_programs row for one faculty member — shared by FDP and STTP, distinguished only by which mutation hook is passed in. */
export function AddDevelopmentProgramEntryModal({
  kind,
  onClose,
  onCreated,
}: {
  kind: "fdp" | "sttp";
  onClose: () => void;
  onCreated: () => void;
}) {
  const addFdp = useAddFdpEntry();
  const addSttp = useAddSttpEntry();
  const addEntry = kind === "fdp" ? addFdp : addSttp;

  const [faculty, setFaculty] = useState<FacultyRow | null>(null);
  const [programmeName, setProgrammeName] = useState("");
  const [hostAgency, setHostAgency] = useState("");
  const [duration, setDuration] = useState("");
  const [attendedOn, setAttendedOn] = useState("");
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]["value"]>("completed");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!faculty || !programmeName.trim()) {
      setError("Faculty and programme name are both required.");
      return;
    }
    setError(null);
    try {
      await addEntry.mutateAsync({
        faculty_id: faculty.id,
        programme_name: programmeName.trim(),
        host_agency: hostAgency.trim() || undefined,
        duration: duration.trim() || undefined,
        attended_on: attendedOn || undefined,
        status,
      });
      onCreated();
      onClose();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Could not save this entry.");
    }
  }

  return (
    <Modal open onClose={onClose} title="Add faculty entry" subtitle={kind === "fdp" ? "Faculty Development Programmes" : "Short Term Training Programmes"}>
      <div className="flex flex-col gap-4">
        <FacultyPicker selected={faculty} onSelect={setFaculty} />

        <div>
          <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Programme</div>
          <input
            value={programmeName}
            onChange={(e) => setProgrammeName(e.target.value)}
            placeholder={kind === "fdp" ? "e.g. Outcome Based Education" : "e.g. AI & Machine Learning Bootcamp"}
            className="mt-1.5 h-11 w-full rounded-[11px] border border-border-default px-3.5 text-[13.5px] outline-none focus:border-primary"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">{kind === "fdp" ? "Host" : "Agency"} (optional)</div>
            <input
              value={hostAgency}
              onChange={(e) => setHostAgency(e.target.value)}
              placeholder="e.g. AICTE, IIT Madras"
              className="mt-1.5 h-11 w-full rounded-[11px] border border-border-default px-3.5 text-[13.5px] outline-none focus:border-primary"
            />
          </div>
          <div>
            <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Duration (optional)</div>
            <input
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="e.g. 5 days, 2 weeks"
              className="mt-1.5 h-11 w-full rounded-[11px] border border-border-default px-3.5 text-[13.5px] outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Attended on</div>
            <input
              type="date"
              value={attendedOn}
              onChange={(e) => setAttendedOn(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-[11px] border border-border-default px-3.5 text-[13.5px] outline-none focus:border-primary"
            />
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
