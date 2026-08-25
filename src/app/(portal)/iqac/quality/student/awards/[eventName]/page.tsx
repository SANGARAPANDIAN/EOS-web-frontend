"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { DataTable, EmptyState, type DataTableColumn } from "@/components/ui";
import { StatTile } from "@/modules/iqac/components/PageControls";
import { useEventParticipants, type AwardParticipantRow } from "@/modules/iqac/api/studentDevelopment";
import { AddAwardEntryModal } from "@/modules/iqac/components/studentDevelopment/AddAwardEntryModal";

export default function EventParticipantsPage() {
  const params = useParams<{ eventName: string }>();
  const router = useRouter();
  const eventName = params.eventName;
  const participants = useEventParticipants(eventName);
  const [addingEntry, setAddingEntry] = useState(false);

  const rows = participants.data ?? [];
  const levels = new Set(rows.map((r) => r.level).filter(Boolean));

  const columns = useMemo<DataTableColumn<AwardParticipantRow>[]>(
    () => [
      { key: "participant", header: "Participant", width: "1.4fr", sortValue: (r) => r.participant, render: (r) => <span className="font-bold text-ink">{r.participant}</span> },
      { key: "result", header: "Result", sortValue: (r) => r.result, render: (r) => r.result },
      { key: "level", header: "Level", sortValue: (r) => r.level ?? "", render: (r) => r.level ?? "—" },
      { key: "date", header: "Date", sortValue: (r) => r.achievement_date, render: (r) => r.achievement_date },
      { key: "venue", header: "Venue", sortValue: (r) => r.venue ?? "", render: (r) => r.venue ?? "—" },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => router.push("/iqac/quality/student/awards")}
          className="w-fit h-10 rounded-[9px] border border-border-default bg-surface px-4 text-[13px] font-bold text-ink hover:bg-surface-tint"
        >
          ← Awards
        </button>
        <button
          type="button"
          onClick={() => setAddingEntry(true)}
          className="hover-lift h-10 shrink-0 rounded-[9px] border border-primary-border bg-primary px-4 text-[13px] font-bold text-white"
        >
          + Add student entry
        </button>
      </div>

      {addingEntry && (
        <AddAwardEntryModal eventName={eventName} onClose={() => setAddingEntry(false)} onCreated={() => participants.refetch()} />
      )}

      {participants.isLoading && (
        <div className="rounded-card border border-border-default bg-surface p-5">
          <EmptyState loading />
        </div>
      )}

      {participants.data && (
        <>
          <div>
            <h1 className="text-[34px] font-extrabold tracking-[-.02em] text-ink">{eventName}</h1>
            <p className="mt-1 text-[15px] font-medium text-muted">Every real sports achievement recorded for this event · Student Development · Awards</p>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <StatTile label="Participants" value={rows.length} />
            <StatTile label="Levels" value={Array.from(levels).join(", ") || "—"} />
            <StatTile label="Most recent" value={rows[0]?.achievement_date ?? "—"} />
          </div>

          <DataTable columns={columns} data={rows} rowKey={(r) => r.id} emptyMessage="No participants found for this event." hoverableRows />
        </>
      )}
    </div>
  );
}
