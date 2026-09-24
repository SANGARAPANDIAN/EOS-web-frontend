"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal, Button, FormField, Input, Textarea, useToast } from "@/modules/admin/components/ui";
import { friendlyError } from "@/lib/utils/errors";
import {
  useCreatePlacementTodo,
  useUpdatePlacementTodo,
  useUploadTodoPdf,
  type CreateTodoInput,
  type PlacementTodo,
} from "@/modules/placement/api/todos";
import { todoFormSchema, type TodoFormValues } from "@/modules/placement/schemas/todo-form.schema";

interface TodoComposerModalProps {
  open: boolean;
  todo: PlacementTodo | null;
  onClose: () => void;
}

function toDefaults(todo: PlacementTodo | null): TodoFormValues {
  return {
    title: todo?.title ?? "",
    description: todo?.description ?? "",
    deadline: todo?.deadline ? todo.deadline.slice(0, 10) : "",
    linkUrl: todo?.linkUrl ?? "",
  };
}

function TodoComposerForm({ todo, onClose }: { todo: PlacementTodo | null; onClose: () => void }) {
  const { show } = useToast();
  const isEditing = todo !== null;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createTodo = useCreatePlacementTodo();
  const updateTodo = useUpdatePlacementTodo();
  const uploadPdf = useUploadTodoPdf();

  const [pdfUrl, setPdfUrl] = useState<string | undefined>(todo?.pdfUrl ?? undefined);
  const [pdfName, setPdfName] = useState<string | undefined>(todo?.pdfUrl ? "Current PDF" : undefined);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TodoFormValues>({
    resolver: zodResolver(todoFormSchema),
    defaultValues: toDefaults(todo),
  });

  function handlePickPdf(file: File | undefined) {
    if (!file) return;
    uploadPdf.mutate(file, {
      onSuccess: ({ pdf_url }) => {
        setPdfUrl(pdf_url);
        setPdfName(file.name);
      },
      onError: (err: unknown) => show(friendlyError(err), "error"),
    });
  }

  function onSubmit(values: TodoFormValues) {
    const input: CreateTodoInput = {
      title: values.title,
      description: values.description || undefined,
      deadline: values.deadline ? new Date(values.deadline).toISOString() : undefined,
      pdfUrl,
      linkUrl: values.linkUrl || undefined,
    };

    const mutation = isEditing ? updateTodo.mutateAsync({ id: todo.id, input }) : createTodo.mutateAsync(input);

    mutation
      .then(() => {
        show(isEditing ? "To-do updated." : "To-do posted to students who opted placement.", "success");
        onClose();
      })
      .catch((err: unknown) => show(friendlyError(err), "error"));
  }

  const isPending = createTodo.isPending || updateTodo.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <FormField label="Question / task" error={errors.title?.message}>
        <Input placeholder="e.g. Upload your updated resume before Friday" {...register("title")} />
      </FormField>

      <FormField label="Details (optional)" error={errors.description?.message}>
        <Textarea rows={4} placeholder="Any extra instructions for students" {...register("description")} />
      </FormField>

      <FormField label="Deadline (optional)">
        <Input type="date" {...register("deadline")} />
      </FormField>

      <FormField label="Link (optional)" hint="A form, drive folder, or external page" error={errors.linkUrl?.message}>
        <Input placeholder="https://…" {...register("linkUrl")} />
      </FormField>

      <FormField label="PDF attachment (optional)" hint="Up to 10MB">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            handlePickPdf(file);
          }}
        />
        <div className="flex items-center gap-3">
          {pdfUrl && <span className="text-[13px] text-admin-body">{pdfName}</span>}
          <button
            type="button"
            disabled={uploadPdf.isPending}
            onClick={() => fileInputRef.current?.click()}
            className="w-fit rounded-admin-sm border border-admin-border-hover px-3 py-1.5 text-[13px] font-semibold text-admin-ink hover:bg-admin-tint-strong disabled:opacity-60"
          >
            {uploadPdf.isPending ? "Uploading…" : pdfUrl ? "Replace PDF" : "Upload PDF"}
          </button>
          {pdfUrl && !uploadPdf.isPending && (
            <button
              type="button"
              onClick={() => {
                setPdfUrl(undefined);
                setPdfName(undefined);
              }}
              className="text-[13px] font-semibold text-admin-muted hover:text-admin-ink"
            >
              Remove
            </button>
          )}
        </div>
      </FormField>

      <div className="mt-2 flex justify-end gap-2 border-t border-admin-divider pt-4">
        <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={isPending}>
          {isPending ? "Saving…" : isEditing ? "Save changes" : "Post to-do"}
        </Button>
      </div>
    </form>
  );
}

export function TodoComposerModal({ open, todo, onClose }: TodoComposerModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={todo ? "Edit to-do" : "New to-do"}
      subtitle="This will be posted to every student who has opted for placement."
      widthClassName="max-w-2xl"
    >
      {open && <TodoComposerForm key={todo?.id ?? "new"} todo={todo} onClose={onClose} />}
    </Modal>
  );
}
