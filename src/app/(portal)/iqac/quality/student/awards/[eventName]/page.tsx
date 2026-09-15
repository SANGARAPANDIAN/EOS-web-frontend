"use client";

import { useCallback, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ConfirmDialog, DataTable, EmptyState, type DataTableColumn } from "@/components/ui";
import { StatTile } from "@/modules/iqac/components/PageControls";
import { useEventParticipants, useDeleteAward, type AwardParticipantRow } from "@/modules/iqac/api/studentDevelopment";
import { AddAwardEntryModal } from "@/modules/iqac/components/studentDevelopment/AddAwardEntryModal";
import { friendlyError } from "@/lib/utils/errors";

export default function EventParticipantsPage() {
  const params = useParams<{ eventName: string }>();
  const router = useRouter();
  // Next hands back the raw (still percent-encoded) path segment here, not
  // the decoded value — using it as-is anywhere (display text, or a second
  // encodeURIComponent when building a request) doubly-encoded the event
  // name, 404ing every single event detail page and even letting a
  // mis-decoded name get saved back as a distinct, garbled event via
  // "+ Add student entry". Decode once, right here, and treat this as the
  // real event name from this point on.
  const eventName = decodeURIComponent(params.eventName);
  const participants = useEventParticipants(eventName);
  const deleteAward = useDeleteAward();
  const [addingEntry, setAddingEntry] = useState(false);
  const [editingEntry, setEditingEntry] = useState<AwardParticipantRow | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<AwardParticipantRow | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const rows = participants.data ?? [];
  const levels = new Set(rows.map((r) => r.level).filter(Boolean));

  const confirmDelete = useCallback(async () => {
    if (!deletingEntry) return;
    setDeleteError(null);
    try {
      await deleteAward.mutateAsync(deletingEntry.id);
      setDeletingEntry(null);
    } catch (err: unknown) {
      setDeleteError(friendlyError(err));
      setDeletingEntry(null);
    }
  }, [deletingEntry, deleteAward]);

  const columns = useMemo<DataTableColumn<AwardParticipantRow>[]>(
    () => [
      { key: "participant", header: "Participant", width: "1.4fr", sortValue: (r) => r.participant, render: (r) => <span className="font-bold text-ink">{r.participant}</span> },
      { key: "result", header: "Result", sortValue: (r) => r.result, render: (r) => r.result },
      { key: "level", header: "Level", sortValue: (r) => r.level ?? "", render: (r) => r.level ?? "—" },
      { key: "date", header: "Date", sortValue: (r) => r.achievement_date, render: (r) => r.achievement_date },
      { key: "venue", header: "Venue", sortValue: (r) => r.venue ?? "", render: (r) => r.venue ?? "—" },
      {
        key: "actions",
        header: "",
        align: "right",
        render: (r) => (
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setEditingEntry(r)} className="text-[12.5px] font-bold text-primary hover:underline">
              Edit
            </button>
            <button type="button" onClick={() => setDeletingEntry(r)} className="text-[12.5px] font-bold text-danger-fg hover:underline">
              Delete
            </button>
          </div>
        ),
      },
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
      {editingEntry && (
        <AddAwardEntryModal
          eventName={eventName}
          editing={editingEntry}
          onClose={() => setEditingEntry(null)}
          onCreated={() => participants.refetch()}
        />
      )}
      <ConfirmDialog
        open={deletingEntry != null}
        title={`Delete ${deletingEntry?.participant}'s entry?`}
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setDeletingEntry(null)}
      />
      {deleteError && <div className="text-[13px] font-semibold text-danger-fg">{deleteError}</div>}

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
