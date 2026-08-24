"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/components/ui";
import { useAddPublicationEntry } from "@/modules/iqac/api/facultyDevelopment";
import { useDepartmentsList } from "@/modules/iqac/api/departments";
import type { FacultyRow } from "@/modules/iqac/api/faculty";
import { FacultyPicker } from "./FacultyPicker";

const AUTHOR_ROLE_OPTIONS: { value: "first_author" | "co_author" | "corresponding_author"; label: string }[] = [
  { value: "first_author", label: "First author" },
  { value: "co_author", label: "Co-author" },
  { value: "corresponding_author", label: "Corresponding author" },
];

const STATUS_OPTIONS: { value: "published" | "accepted" | "under_review" | "submitted"; label: string }[] = [
  { value: "published", label: "Published" },
  { value: "accepted", label: "Accepted" },
  { value: "under_review", label: "Under review" },
  { value: "submitted", label: "Submitted" },
];

function todayDateInput(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Records a real faculty_publications row, via
 * IqacFacultyDevelopmentService.addPublicationEntry(). "Title" isn't in
 * the reference mock but is a real NOT NULL column the page's own venue
 * drilldown displays — a paper with no title would be unidentifiable, so
 * it's added back here (flagged, not silently invented). Head of
 * department is read-only, straight from the real departments.hod the
 * IQAC Departments page already shows — informational only, since there's
 * nowhere honest to persist "who was HOD at publication time".
 */
export function AddPublicationEntryModal({ onClose, onCreated, venue: lockedVenue }: { onClose: () => void; onCreated: () => void; venue?: string }) {
  const addEntry = useAddPublicationEntry();
  const departments = useDepartmentsList();

  const [faculty, setFaculty] = useState<FacultyRow | null>(null);
  const [title, setTitle] = useState("");
  const [venue, setVenue] = useState(lockedVenue ?? "");
  const [authorRole, setAuthorRole] = useState<(typeof AUTHOR_ROLE_OPTIONS)[number]["value"]>("first_author");
  const [indexing, setIndexing] = useState("");
  const [publishedOn, setPublishedOn] = useState(todayDateInput());
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]["value"]>("published");
  const [error, setError] = useState<string | null>(null);

  const hod = useMemo(() => {
    if (!faculty?.department) return null;
    return departments.data?.find((d) => d.id === faculty.department!.id)?.hod ?? null;
  }, [faculty, departments.data]);

  async function submit() {
    if (!faculty || !title.trim()) {
      setError("Faculty and title are both required.");
      return;
    }
    setError(null);
    try {
      await addEntry.mutateAsync({
        faculty_id: faculty.id,
        title: title.trim(),
        venue: venue.trim() || undefined,
        author_role: authorRole,
        indexing: indexing.trim() || undefined,
        published_date: publishedOn || undefined,
        status,
      });
      onCreated();
      onClose();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Could not save this publication.");
    }
  }

  return (
    <Modal open onClose={onClose} title="Add faculty entry" subtitle={`Contributing authors · ${lockedVenue ?? (venue || "Publications")}`}>
      <div className="flex flex-col gap-4">
        <FacultyPicker selected={faculty} onSelect={setFaculty} />

        <div>
          <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Title</div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Paper title"
            className="mt-1.5 h-11 w-full rounded-[11px] border border-border-default px-3.5 text-[13.5px] outline-none focus:border-primary"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Journal / venue</div>
            {lockedVenue ? (
              <div className="mt-1.5 h-11 flex items-center rounded-[11px] border border-border-default bg-surface-tint px-3.5 text-[13.5px] font-bold text-ink">{lockedVenue}</div>
            ) : (
              <input
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="e.g. IEEE Access"
                className="mt-1.5 h-11 w-full rounded-[11px] border border-border-default px-3.5 text-[13.5px] outline-none focus:border-primary"
              />
            )}
          </div>
          <div>
            <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Author role</div>
            <select
              value={authorRole}
              onChange={(e) => setAuthorRole(e.target.value as typeof authorRole)}
              className="mt-1.5 h-11 w-full rounded-[11px] border border-border-default bg-surface px-3 text-[13.5px] outline-none focus:border-primary"
            >
              {AUTHOR_ROLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Indexing</div>
            <input
              value={indexing}
              onChange={(e) => setIndexing(e.target.value)}
              placeholder="e.g. Scopus, SCIE"
              className="mt-1.5 h-11 w-full rounded-[11px] border border-border-default px-3.5 text-[13.5px] outline-none focus:border-primary"
            />
          </div>
          <div>
            <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Published on</div>
            <input
              type="date"
              value={publishedOn}
              onChange={(e) => setPublishedOn(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-[11px] border border-border-default px-3.5 text-[13.5px] outline-none focus:border-primary"
            />
          </div>
        </div>

        <div>
          <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Head of department</div>
          <div className="mt-1.5 h-11 flex items-center rounded-[11px] border border-border-default bg-surface-tint px-3.5 text-[13.5px] font-bold text-ink">{hod?.name ?? "Not assigned"}</div>
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
