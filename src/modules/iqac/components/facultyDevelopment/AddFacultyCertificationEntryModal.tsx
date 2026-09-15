"use client";

import { useRef, useState } from "react";
import { Modal } from "@/components/ui";
import { useAddFacultyCertificationEntry, useUpdateFacultyCertificationEntry, uploadIqacCertificateFile, type FacultyCertificationRow } from "@/modules/iqac/api/facultyDevelopment";
import type { FacultyRow } from "@/modules/iqac/api/faculty";
import { FacultyPicker } from "./FacultyPicker";

const STATUS_OPTIONS: { value: "enrolled" | "in_progress" | "completed"; label: string }[] = [
  { value: "enrolled", label: "Enrolled" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
];

/** Records a real faculty_certifications row for one faculty member. */
export function AddFacultyCertificationEntryModal({
  onClose,
  onCreated,
  editing,
}: {
  onClose: () => void;
  onCreated: () => void;
  /** Editing an existing certification — the faculty can't be changed here (delete + re-add for that). */
  editing?: FacultyCertificationRow;
}) {
  const isEditing = editing != null;
  const create = useAddFacultyCertificationEntry();
  const update = useUpdateFacultyCertificationEntry();

  const [faculty, setFaculty] = useState<FacultyRow | null>(null);
  const [platform, setPlatform] = useState(editing?.platform ?? "");
  const [track, setTrack] = useState(editing?.track ?? "");
  const [score, setScore] = useState(editing?.score ?? "");
  const [completedOn, setCompletedOn] = useState(editing?.completed_on?.slice(0, 10) ?? "");
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]["value"]>((editing?.status as (typeof STATUS_OPTIONS)[number]["value"]) ?? "completed");
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function submit() {
    if (!isEditing && (!faculty || !platform.trim() || !track.trim())) {
      setError("Faculty, platform and track are all required.");
      return;
    }
    setError(null);
    try {
      let certificateUrl: string | undefined;
      if (certificateFile) {
        setUploading(true);
        try {
          const uploaded = await uploadIqacCertificateFile(certificateFile);
          certificateUrl = uploaded.url;
        } finally {
          setUploading(false);
        }
      }
      if (isEditing) {
        await update.mutateAsync({
          id: editing.id,
          input: {
            platform: platform.trim(),
            track: track.trim(),
            score: score.trim() || undefined,
            completed_on: completedOn || undefined,
            status,
            certificate_url: certificateUrl ?? editing.certificate_url ?? undefined,
          },
        });
        onCreated();
        onClose();
        return;
      }
      await create.mutateAsync({
        faculty_id: faculty!.id,
        platform: platform.trim(),
        track: track.trim(),
        score: score.trim() || undefined,
        completed_on: completedOn || undefined,
        status,
        certificate_url: certificateUrl,
      });
      onCreated();
      onClose();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Could not save this entry.");
    }
  }

  return (
    <Modal open onClose={onClose} title={isEditing ? "Edit faculty entry" : "Add faculty entry"} subtitle="Faculty Certifications">
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
            <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Platform</div>
            <input
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              placeholder="e.g. Coursera, NPTEL"
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
              placeholder="e.g. 92%"
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

        <div className="grid grid-cols-2 gap-4">
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
          <div>
            <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Certificate (optional)</div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={(e) => setCertificateFile(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-1.5 h-11 w-full truncate rounded-[11px] border border-border-default px-3.5 text-left text-[13.5px] text-body hover:bg-surface-tint"
            >
              {certificateFile ? certificateFile.name : isEditing && editing.certificate_url ? "Replace certificate — PDF, JPG or PNG" : "Choose file — PDF, JPG or PNG"}
            </button>
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
            disabled={create.isPending || update.isPending || uploading}
            className="h-[42px] rounded-[10px] border border-primary-border bg-primary px-4 text-[13.5px] font-bold text-white disabled:opacity-50"
          >
            {uploading ? "Uploading…" : create.isPending || update.isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
