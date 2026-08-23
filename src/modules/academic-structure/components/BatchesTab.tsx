"use client";

import { useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Spinner } from "@/components/ui/Spinner";
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

  const columns: DataTableColumn<Batch>[] = [
    {
      key: "name",
      header: "Batch",
      width: "1.5fr",
      render: (b) => <span className="font-semibold text-ink">{b.name}</span>,
    },
    { key: "start", header: "Starts", width: ".8fr", render: (b) => b.start_year },
    { key: "end", header: "Ends", width: ".8fr", render: (b) => b.end_year },
    {
      key: "classes",
      header: "Classes",
      width: ".8fr",
      render: (b) => classes.filter((c) => c.batch_id === b.id).length || "—",
    },
    {
      key: "actions",
      header: "",
      width: "1fr",
      align: "right",
      render: (b) => {
        if (readOnly) return null;
        const classCount = classes.filter((c) => c.batch_id === b.id).length;
        const isDeleting = deletingId === b.id;
        return (
          <div className="flex justify-end gap-1.5">
            <IconButton icon="edit" size={30} iconSize={15} onClick={() => onEdit?.(b)} title="Edit" />
            {isDeleting ? (
              <span className="flex size-[30px] items-center justify-center">
                <Spinner size={15} className="text-danger-fg" />
              </span>
            ) : (
              <IconButton
                icon="delete"
                size={30}
                iconSize={15}
                onClick={() => handleDelete(b)}
                title={classCount > 0 ? `Has ${classCount} classes — remove those first` : "Delete"}
                disabled={classCount > 0}
                className="text-danger-fg hover:border-danger-border hover:bg-danger-bg disabled:cursor-not-allowed disabled:text-subtle disabled:hover:border-border-default disabled:hover:bg-surface"
              />
            )}
          </div>
        );
      },
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={batches}
        rowKey={(b) => b.id}
        emptyMessage="No batches yet."
        title={
          <div>
            <h2 className="text-[15px] font-extrabold text-ink">Batches</h2>
            <p className="mt-0.5 text-xs font-normal text-muted">
              An intake, shared by every department. Classes are created per batch, so this list has to exist before
              sections can.
            </p>
          </div>
        }
        titleNote={
          !readOnly && (
            <Button variant="primarySmall" onClick={onAdd}>
              + Add batch
            </Button>
          )
        }
      />

      {!readOnly && blockers && (
        <CannotDeleteModal open={!!blockers} onClose={() => setBlockers(null)} label={blockers.label} blockers={blockers.items} />
      )}
    </>
  );
}
