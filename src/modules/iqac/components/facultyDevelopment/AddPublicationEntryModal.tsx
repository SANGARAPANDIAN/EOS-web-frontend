"use client";

import { useState } from "react";
import { Modal } from "@/components/ui";
import { useAddPublicationEntry, useUpdatePublicationEntry, type VenuePublicationRow } from "@/modules/iqac/api/facultyDevelopment";
import { ContributorPicker, type Contributor } from "./ContributorPicker";

const CONTRIBUTOR_ROLE_OPTIONS = [
  { value: "primary_author", label: "Primary author" },
  { value: "secondary_author", label: "Secondary author" },
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
 * Records a real `publications` row plus one `publication_contributors` row
 * per contributor (faculty and/or students, each Primary/Secondary author)
 * — the redesigned successor to the single-faculty "Add faculty entry"
 * modal. Requires research_development_rename.query.md Steps 1-3 to have
 * been run; the backend surfaces a clear error otherwise rather than
 * silently dropping contributors.
 */
export function AddPublicationEntryModal({
  onClose,
  onCreated,
  venue: lockedVenue,
  editing,
}: {
  onClose: () => void;
  onCreated: () => void;
  venue?: string;
  editing?: VenuePublicationRow;
}) {
  const isEditing = editing != null;
  const create = useAddPublicationEntry();
  const update = useUpdatePublicationEntry();

  const [title, setTitle] = useState(editing?.title ?? "");
  const [venue, setVenue] = useState(lockedVenue ?? "");
  const [indexing, setIndexing] = useState("");
  const [publishedOn, setPublishedOn] = useState(isEditing ? "" : todayDateInput());
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]["value"]>("published");
  const [contributors, setContributors] = useState<Contributor[]>(
    editing?.contributors.map((c) => ({ type: c.type, id: c.id, name: c.name, subtitle: "", role: c.role })) ?? [],
  );
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (contributors.length === 0) {
      setError("Add at least one contributor.");
      return;
    }
    setError(null);

    const contributorInput = contributors.map((c) => ({ type: c.type, id: c.id, role: c.role }));

    try {
      if (isEditing) {
        await update.mutateAsync({
          id: editing.id,
          input: {
            title: title.trim(),
            venue: venue.trim() || undefined,
            indexing: indexing.trim() || undefined,
            published_date: publishedOn || undefined,
            status,
            contributors: contributorInput,
          },
        });
      } else {
        await create.mutateAsync({
          title: title.trim(),
          venue: venue.trim() || undefined,
          indexing: indexing.trim() || undefined,
          published_date: publishedOn || undefined,
          status,
          contributors: contributorInput,
        });
      }
      onCreated();
      onClose();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Could not save this publication.");
    }
  }

  return (
    <Modal open onClose={onClose} title={isEditing ? "Edit publication" : "Add publication"} subtitle={`Contributors · ${lockedVenue ?? (venue || "Publications")}`}>
      <div className="flex flex-col gap-4">
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
            <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Indexing</div>
            <input
              value={indexing}
              onChange={(e) => setIndexing(e.target.value)}
              placeholder="e.g. Scopus, SCIE"
              className="mt-1.5 h-11 w-full rounded-[11px] border border-border-default px-3.5 text-[13.5px] outline-none focus:border-primary"
            />
          </div>
        </div>

        <div>
          <div className="text-[10.5px] font-extrabold tracking-[.08em] text-subtle uppercase">Published on (optional)</div>
          <input
            type="date"
            value={publishedOn}
            onChange={(e) => setPublishedOn(e.target.value)}
            className="mt-1.5 h-11 w-full rounded-[11px] border border-border-default px-3.5 text-[13.5px] outline-none focus:border-primary"
          />
        </div>

        <ContributorPicker value={contributors} onChange={setContributors} roleOptions={CONTRIBUTOR_ROLE_OPTIONS} />

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
