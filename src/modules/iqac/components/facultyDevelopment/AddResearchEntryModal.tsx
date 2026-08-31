"use client";

import { useState } from "react";
import { Modal } from "@/components/ui";
import { useAddResearchEntry, useUpdateResearchEntry, type ResearchRow } from "@/modules/iqac/api/facultyDevelopment";
import type { FacultyRow } from "@/modules/iqac/api/faculty";
import { FacultyPicker } from "./FacultyPicker";

const ROLE_OPTIONS = ["Principal Investigator", "Co-Investigator", "Team Member"];
const PROJECT_STATUS_OPTIONS: { value: "ongoing" | "completed"; label: string }[] = [
  { value: "ongoing", label: "Ongoing" },
  { value: "completed", label: "Completed" },
];

/** Records a real faculty_research_project_members row, finding or creating the real faculty_research_projects row by centre name. */
export function AddResearchEntryModal({
  onClose,
  onCreated,
  editing,
}: {
  onClose: () => void;
  onCreated: () => void;
  /** Editing an existing membership — faculty/centre can't be reassigned here (delete + re-add for that); focus_area/status edit the shared project. */
  editing?: ResearchRow;
}) {
  const isEditing = editing != null;
  const create = useAddResearchEntry();
  const update = useUpdateResearchEntry();

  const [faculty, setFaculty] = useState<FacultyRow | null>(null);
  const [centreName, setCentreName] = useState(editing?.centre_name ?? "");
  const [focusArea, setFocusArea] = useState(editing?.focus_area ?? "");
  const [role, setRole] = useState(editing?.role ?? ROLE_OPTIONS[0]);
  const [joinedOn, setJoinedOn] = useState(editing?.joined_on?.slice(0, 10) ?? "");
  const [projectStatus, setProjectStatus] = useState<(typeof PROJECT_STATUS_OPTIONS)[number]["value"]>((editing?.project_status as (typeof PROJECT_STATUS_OPTIONS)[number]["value"]) ?? "ongoing");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (isEditing) {
      setError(null);
      try {
        await update.mutateAsync({
          id: editing.id,
          input: { role, joined_on: joinedOn || undefined, focus_area: focusArea.trim() || undefined, status: projectStatus },
        });
        onCreated();
        onClose();
      } catch (err: unknown) {
        setError((err as { message?: string })?.message ?? "Could not save this entry.");
      }
      return;
    }
    if (!faculty || !centreName.trim()) {
      setError("Faculty and centre / project name are both required.");
      return;
    }
    setError(null);
    try {
      await create.mutateAsync({
        faculty_id: faculty.id,
        centre_name: centreName.trim(),
        focus_area: focusArea.trim() || undefined,
        role,
        joined_on: joinedOn || undefined,
      });
      onCreated();
      onClose();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Could not save this entry.");
    }
  }

  return (
    <Modal open onClose={onClose} title={isEditing ? "Edit faculty entry" : "Add faculty entry"} subtitle="Research centres & projects">
      <div className="flex flex-col gap-4">
        {isEditing ? (
          <div>
            <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Faculty</div>
            <div className="mt-1.5 h-11 flex items-center rounded-[11px] border border-border-default bg-surface-tint px-3.5 text-[13.5px] font-bold text-ink">{editing.faculty.name}</div>
          </div>
        ) : (
          <FacultyPicker selected={faculty} onSelect={setFaculty} />
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Centre / Project</div>
            {isEditing ? (
              <div className="mt-1.5 h-11 flex items-center rounded-[11px] border border-border-default bg-surface-tint px-3.5 text-[13.5px] font-bold text-ink">{centreName}</div>
            ) : (
              <>
                <input
                  value={centreName}
                  onChange={(e) => setCentreName(e.target.value)}
                  placeholder="e.g. Centre for AI Research"
                  className="mt-1.5 h-11 w-full rounded-[11px] border border-border-default px-3.5 text-[13.5px] outline-none focus:border-primary"
                />
                <p className="mt-1 text-[11px] text-subtle">Matches an existing centre by this exact name, or creates one.</p>
              </>
            )}
          </div>
          <div>
            <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Focus area (optional)</div>
            <input
              value={focusArea}
              onChange={(e) => setFocusArea(e.target.value)}
              placeholder="e.g. Computer Vision"
              className="mt-1.5 h-11 w-full rounded-[11px] border border-border-default px-3.5 text-[13.5px] outline-none focus:border-primary"
            />
          </div>
        </div>

        {isEditing && (
          <div>
            <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Project status</div>
            <select
              value={projectStatus}
              onChange={(e) => setProjectStatus(e.target.value as typeof projectStatus)}
              className="mt-1.5 h-11 w-full rounded-[11px] border border-border-default bg-surface px-3 text-[13.5px] outline-none focus:border-primary"
            >
              {PROJECT_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Role</div>
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
          <div>
            <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Joined on</div>
            <input
              type="date"
              value={joinedOn}
              onChange={(e) => setJoinedOn(e.target.value)}
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
