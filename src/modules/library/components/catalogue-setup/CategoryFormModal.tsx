"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal, Button, FormField, Input, useToast } from "@/modules/admin/components/ui";
import { friendlyError } from "@/lib/utils/errors";
import { useCreateCategory, useUpdateCategory, type BookCategory } from "@/modules/library/api/categories";
import { categoryFormSchema, type CategoryFormValues } from "@/modules/library/schemas/category-form.schema";

interface CategoryFormModalProps {
  open: boolean;
  category: BookCategory | null;
  onClose: () => void;
}

export function CategoryFormModal({ open, category, onClose }: CategoryFormModalProps) {
  const { show } = useToast();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const isEditing = category !== null;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: { name: category?.name ?? "" },
  });

  useEffect(() => {
    reset({ name: category?.name ?? "" });
  }, [category, open, reset]);

  function onSubmit(values: CategoryFormValues) {
    const mutation = isEditing
      ? updateCategory.mutateAsync({ id: category.id, name: values.name })
      : createCategory.mutateAsync(values.name);

    mutation
      .then(() => {
        show(isEditing ? "Category updated." : "Category added.", "success");
        onClose();
      })
      .catch((err: unknown) => show(friendlyError(err), "error"));
  }

  const isPending = createCategory.isPending || updateCategory.isPending;

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? "Edit category" : "Add category"}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormField label="Name" error={errors.name?.message}>
          <Input className={errors.name ? "border-admin-danger" : undefined} {...register("name")} />
        </FormField>
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isPending}>
            {isPending ? "Saving…" : isEditing ? "Save changes" : "Add category"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
