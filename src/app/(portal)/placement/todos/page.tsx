"use client";

import { useState } from "react";
import { friendlyError } from "@/lib/utils/errors";
import {
  PageHeader,
  Button,
  Badge,
  Card,
  ConfirmDialog,
  PendingNotice,
  EmptyState,
  useToast,
} from "@/modules/admin/components/ui";
import { dateTimeLabel } from "@/modules/placement/lib/format";
import { usePlacementTodos, useDeletePlacementTodo, type PlacementTodo } from "@/modules/placement/api/todos";
import { TodoComposerModal } from "@/modules/placement/components/todos/TodoComposerModal";

function TodoCard({ todo, onEdit, onDelete }: { todo: PlacementTodo; onEdit: () => void; onDelete: () => void }) {
  return (
    <Card hoverable={false} className="p-5">
      <div className="flex flex-wrap items-center gap-2.5">
        <Badge tone={todo.isActive ? "primary" : "neutral"}>{todo.isActive ? "Active" : "Removed"}</Badge>
        <span className="text-xs text-admin-muted">{dateTimeLabel(todo.createdAt)}</span>
        {todo.deadline && <span className="text-xs text-admin-muted">· Due {dateTimeLabel(todo.deadline)}</span>}
        <span className="flex-1" />
        <span className="text-xs text-admin-subtle">
          {todo.completedCount} of {todo.totalStudents} done
        </span>
      </div>
      <div className="mt-2.5 text-base font-bold tracking-[-.01em] text-admin-ink">{todo.title}</div>
      {todo.description && <p className="mt-1 text-sm leading-relaxed text-admin-body">{todo.description}</p>}
      <div className="mt-2.5 flex flex-wrap items-center gap-3.5">
        {todo.pdfUrl && (
          <a href={todo.pdfUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-admin-primary hover:text-admin-primary-dark">
            View PDF
          </a>
        )}
        {todo.linkUrl && (
          <a href={todo.linkUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-admin-primary hover:text-admin-primary-dark">
            Open link
          </a>
        )}
        {todo.isActive && (
          <>
            <span className="flex-1" />
            <button type="button" onClick={onEdit} className="text-xs font-semibold text-admin-primary hover:text-admin-primary-dark">
              Edit
            </button>
            <button type="button" onClick={onDelete} className="text-xs font-semibold text-admin-danger hover:text-admin-danger">
              Delete
            </button>
          </>
        )}
      </div>
    </Card>
  );
}

export default function PlacementTodosPage() {
  const { show } = useToast();
  const { data, isLoading, error } = usePlacementTodos();
  const deleteTodo = useDeletePlacementTodo();

  const [composerTarget, setComposerTarget] = useState<PlacementTodo | "new" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PlacementTodo | null>(null);

  const rows = (data ?? []).filter((t) => t.isActive);

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    deleteTodo.mutate(deleteTarget.id, {
      onSuccess: () => {
        show("To-do removed.", "success");
        setDeleteTarget(null);
      },
      onError: (err: unknown) => show(friendlyError(err), "error"),
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Todo"
        description="Post a question or task, with an optional PDF or link, to every student who has opted for placement."
        actions={
          <Button variant="primary" onClick={() => setComposerTarget("new")}>
            New to-do
          </Button>
        }
      />

      <div className="flex flex-col gap-3.5">
        {isLoading && <PendingNotice reason="Loading…" height={100} />}
        {!isLoading && error && <PendingNotice reason={friendlyError(error)} height={100} />}
        {!isLoading && !error && rows.length === 0 && (
          <EmptyState icon="checklist" title="No to-dos posted yet" description="Students who opted placement will see these in their Todo tab." />
        )}
        {rows.map((t) => (
          <TodoCard key={t.id} todo={t} onEdit={() => setComposerTarget(t)} onDelete={() => setDeleteTarget(t)} />
        ))}
      </div>

      <TodoComposerModal
        open={composerTarget !== null}
        todo={composerTarget === "new" || composerTarget === null ? null : composerTarget}
        onClose={() => setComposerTarget(null)}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete to-do"
        message={`Delete "${deleteTarget?.title}"? Students will no longer see it.`}
        confirmLabel="Delete"
        destructive
        isConfirming={deleteTodo.isPending}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
