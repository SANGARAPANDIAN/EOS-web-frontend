"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/modules/admin/components/ui/ToastProvider";
import { ApiError } from "@/types/api";
import { useDeleteBatch } from "../hooks/useAcademicStructureMutations";
import { CannotDeleteModal } from "./CannotDeleteModal";
import { formatBlockers } from "../lib/formatBlockers";
import type { Batch, SchoolClass } from "../types";

interface BatchesTabProps {
  batches: Batch[];
  classes: SchoolClass[];
  onAdd?: () => void;
  onEdit?: (batch: Batch) => void;
  /** Hides add/edit/delete affordances — for viewers without write access, e.g. the Academic Coordinator. */
  readOnly?: boolean;
}

export function BatchesTab({ batches, classes, onAdd, onEdit, readOnly = false }: BatchesTabProps) {
  const [blockers, setBlockers] = useState<{ label: string; items: string[] } | null>(null);
  // One mutation instance is shared across every row, so track which row
  // triggered it — otherwise every row's delete button would show "pending"
  // while only one batch is actually being deleted.
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const deleteBatch = useDeleteBatch();
  const { show } = useToast();

  function handleDelete(batch: Batch) {
    setDeletingId(batch.id);
    deleteBatch
      .mutateAsync(batch.id)
      .then(() => show("Deleted", "success"))
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.details) {
          setBlockers({ label: `batch "${batch.name}"`, items: formatBlockers(err.details) });
        } else {
          show(err instanceof ApiError ? err.message : "Something went wrong. Please try again.", "error");
        }
      })
      .finally(() => setDeletingId(null));
  }

  return (
    <div className="overflow-hidden rounded-card border border-border-default bg-surface">
      <div className="flex items-center justify-between border-b border-divider px-4.5 py-4">
        <div>
          <h2 className="m-0 text-[15px] font-bold text-ink">Batches</h2>
          <p className="mt-1 text-xs text-muted">
            An intake, shared by every department. Classes are created per batch, so this list has to exist before sections can.
          </p>
        </div>
        {!readOnly && (
          <Button variant="secondary" className="flex w-auto items-center gap-1.5" onClick={onAdd}>
            <Icon name="add" size={16} /> Add batch
          </Button>
        )}
      </div>

      <div className="grid grid-cols-[1.5fr_.8fr_.8fr_.8fr_1fr] gap-3.5 border-b border-divider bg-surface-tint px-4.5 py-2.5 text-[11px] font-bold tracking-[.3px] text-muted">
        <div>BATCH</div>
        <div>STARTS</div>
        <div>ENDS</div>
        <div>CLASSES</div>
        <div />
      </div>

      {batches.length === 0 && <div className="p-10 text-center text-[12.5px] text-subtle">No batches yet.</div>}

      {batches.map((b) => {
        const classCount = classes.filter((c) => c.batch_id === b.id).length;
        return (
          <div
            key={b.id}
            className="grid grid-cols-[1.5fr_.8fr_.8fr_.8fr_1fr] items-center gap-3.5 border-b border-divider px-4.5 py-3 text-[12.5px]"
          >
            <div className="font-semibold text-ink">{b.name}</div>
            <div>{b.start_year}</div>
            <div>{b.end_year}</div>
            <div>{classCount || "—"}</div>
            <div className="flex justify-end gap-1.5">
              {!readOnly && (
                <>
                  <button
                    type="button"
                    onClick={() => onEdit?.(b)}
                    title="Edit"
                    className="rounded-input p-1.5 text-muted hover:bg-surface-tint"
                  >
                    <Icon name="edit" size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(b)}
                    title={classCount > 0 ? `Has ${classCount} classes — remove those first` : "Delete"}
                    disabled={classCount > 0 || deletingId === b.id}
                    className={
                      classCount > 0 || deletingId === b.id
                        ? "cursor-not-allowed rounded-input p-1.5 text-subtle"
                        : "rounded-input p-1.5 text-muted hover:bg-danger-bg hover:text-danger-fg"
                    }
                  >
                    {deletingId === b.id ? (
                      <span className="inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
                    ) : (
                      <Icon name="delete" size={16} />
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}

      {!readOnly && blockers && (
        <CannotDeleteModal open={!!blockers} onClose={() => setBlockers(null)} label={blockers.label} blockers={blockers.items} />
      )}
    </div>
  );
}
