"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal, Button, FormField, Input, Select, useToast } from "@/modules/admin/components/ui";
import { friendlyError } from "@/lib/utils/errors";
import { numberFieldOptions, textFieldOptions } from "@/lib/utils/rhf-helpers";
import { useCategories } from "@/modules/library/api/categories";
import { useCreateEResource, useUpdateEResource, type EResource } from "@/modules/library/api/eResources";
import { eResourceFormSchema, type EResourceFormValues } from "@/modules/library/schemas/e-resource-form.schema";

interface EResourceFormModalProps {
  open: boolean;
  resource: EResource | null;
  onClose: () => void;
}

function toDefaults(resource: EResource | null): EResourceFormValues {
  return {
    title: resource?.title ?? "",
    url: resource?.url ?? "",
    category_id: resource?.category_id ?? undefined,
    format: resource?.format ?? undefined,
    file_size_bytes: resource?.file_size_bytes ?? undefined,
    pages: resource?.pages ?? undefined,
    license_type: resource?.license_type ?? undefined,
    concurrent_seats: resource?.concurrent_seats ?? undefined,
    publish_state: resource?.publish_state ?? "draft",
  };
}

export function EResourceFormModal({ open, resource, onClose }: EResourceFormModalProps) {
  const { show } = useToast();
  const isEditing = resource !== null;

  const { data: categories } = useCategories();
  const createResource = useCreateEResource();
  const updateResource = useUpdateEResource();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EResourceFormValues>({
    resolver: zodResolver(eResourceFormSchema),
    defaultValues: toDefaults(resource),
  });

  useEffect(() => {
    reset(toDefaults(resource));
  }, [resource, open, reset]);

  function onSubmit(values: EResourceFormValues) {
    const mutation = isEditing
      ? updateResource.mutateAsync({ id: resource.id, input: values })
      : createResource.mutateAsync(values);

    mutation
      .then(() => {
        show(isEditing ? "eBook updated." : "eBook added.", "success");
        onClose();
      })
      .catch((err: unknown) => show(friendlyError(err), "error"));
  }

  const isPending = createResource.isPending || updateResource.isPending;

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? "Edit eBook" : "Add eBook"} widthClassName="max-w-2xl">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Title" error={errors.title?.message}>
            <Input className={errors.title ? "border-admin-danger" : undefined} {...register("title")} />
          </FormField>
          <FormField label="URL" hint="Link to the uploaded file" error={errors.url?.message}>
            <Input className={errors.url ? "border-admin-danger" : undefined} {...register("url")} />
          </FormField>

          <FormField label="Category" error={errors.category_id?.message}>
            <Select {...register("category_id", numberFieldOptions)}>
              <option value="">No category</option>
              {categories?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Format" error={errors.format?.message}>
            <Select {...register("format", textFieldOptions)}>
              <option value="">Not set</option>
              <option value="PDF">PDF</option>
              <option value="EPUB">EPUB</option>
              <option value="MOBI">MOBI</option>
              <option value="DOCX">DOCX</option>
              <option value="Other">Other</option>
            </Select>
          </FormField>

          <FormField label="License type" error={errors.license_type?.message}>
            <Select {...register("license_type", textFieldOptions)}>
              <option value="">Not set</option>
              <option value="institution_licence">Institution licence</option>
              <option value="open_access">Open access</option>
              <option value="department_copy">Department copy</option>
              <option value="reference_only">Reference only</option>
            </Select>
          </FormField>
          <FormField label="Publish state" error={errors.publish_state?.message}>
            <Select {...register("publish_state", textFieldOptions)}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </Select>
          </FormField>

          <FormField label="Pages" error={errors.pages?.message}>
            <Input type="number" {...register("pages", numberFieldOptions)} />
          </FormField>
          <FormField label="File size (bytes)" error={errors.file_size_bytes?.message}>
            <Input type="number" {...register("file_size_bytes", numberFieldOptions)} />
          </FormField>
          <FormField label="Concurrent seats" error={errors.concurrent_seats?.message}>
            <Input type="number" {...register("concurrent_seats", numberFieldOptions)} />
          </FormField>
        </div>

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isPending}>
            {isPending ? "Saving…" : isEditing ? "Save changes" : "Add eBook"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
