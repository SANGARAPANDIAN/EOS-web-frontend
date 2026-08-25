"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { DataTable, EmptyState, type DataTableColumn } from "@/components/ui";
import { StatTile } from "@/modules/iqac/components/PageControls";
import { useVenuePublications, type VenuePublicationRow } from "@/modules/iqac/api/facultyDevelopment";
import { AddPublicationEntryModal } from "@/modules/iqac/components/facultyDevelopment/AddPublicationEntryModal";

export default function VenuePublicationsPage() {
  const params = useParams<{ venue: string }>();
  const router = useRouter();
  const venue = params.venue;
  const publications = useVenuePublications(venue);
  const [addingEntry, setAddingEntry] = useState(false);

  const rows = publications.data ?? [];
  const authors = new Set(rows.map((r) => r.author.faculty_id));
  const totalCitations = rows.reduce((sum, r) => sum + r.citation_count, 0);

  const columns = useMemo<DataTableColumn<VenuePublicationRow>[]>(
    () => [
      { key: "title", header: "Title", width: "1.8fr", sortValue: (r) => r.title, render: (r) => <span className="font-bold text-ink">{r.title}</span> },
      { key: "author", header: "Author", sortValue: (r) => r.author.name, render: (r) => `${r.author.name}${r.author.department_code ? ` · ${r.author.department_code}` : ""}` },
      { key: "type", header: "Type", sortValue: (r) => r.type, render: (r) => r.type },
      { key: "year", header: "Year", sortValue: (r) => r.year ?? -1, render: (r) => r.year ?? "—" },
      { key: "citations", header: "Citations", align: "right", sortValue: (r) => r.citation_count, render: (r) => r.citation_count },
      { key: "doi", header: "DOI", sortValue: (r) => r.doi ?? "", render: (r) => r.doi ?? "—" },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => router.push("/iqac/quality/faculty/publications")}
          className="w-fit h-10 rounded-[9px] border border-border-default bg-surface px-4 text-[13px] font-bold text-ink hover:bg-surface-tint"
        >
          ← Publications
        </button>
        <button
          type="button"
          onClick={() => setAddingEntry(true)}
          className="hover-lift h-10 shrink-0 rounded-[9px] border border-primary-border bg-primary px-4 text-[13px] font-bold text-white"
        >
          + Add faculty entry
        </button>
      </div>

      {addingEntry && (
        <AddPublicationEntryModal venue={venue} onClose={() => setAddingEntry(false)} onCreated={() => publications.refetch()} />
      )}

      {publications.isLoading && (
        <div className="rounded-card border border-border-default bg-surface p-5">
          <EmptyState loading />
        </div>
      )}

      {publications.data && (
        <>
          <div>
            <h1 className="text-[34px] font-extrabold tracking-[-.02em] text-ink">{venue}</h1>
            <p className="mt-1 text-[15px] font-medium text-muted">Every real paper on file for this venue · Faculty Development · Publications</p>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <StatTile label="Papers" value={rows.length} />
            <StatTile label="Contributing authors" value={authors.size} />
            <StatTile label="Total citations" value={totalCitations} />
          </div>

          <DataTable columns={columns} data={rows} rowKey={(r) => r.id} emptyMessage="No papers found for this venue." hoverableRows />
        </>
      )}
    </div>
  );
}
