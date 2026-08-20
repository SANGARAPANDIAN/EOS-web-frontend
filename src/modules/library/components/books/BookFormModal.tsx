"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal, Button, FormField, Input, Select, useToast } from "@/modules/admin/components/ui";
import { friendlyError } from "@/lib/utils/errors";
import { numberFieldOptions, textFieldOptions } from "@/lib/utils/rhf-helpers";
import { useDepartments } from "@/modules/admin/api/refData";
import { useCategories } from "@/modules/library/api/categories";
import { useRacks } from "@/modules/library/api/racks";
import { useCreateBook, useUpdateBook, type Book, type CreateBookInput } from "@/modules/library/api/books";
import { bookFormSchema, type BookFormValues } from "@/modules/library/schemas/book-form.schema";

interface BookFormModalProps {
  open: boolean;
  book: Book | null;
  onClose: () => void;
}

function toDefaults(book: Book | null): BookFormValues {
  return {
    qr_code: book?.qr_code ?? "",
    title: book?.title ?? "",
    author: book?.author ?? undefined,
    isbn: book?.isbn ?? undefined,
    publisher: book?.publisher ?? undefined,
    edition: book?.edition ?? undefined,
    category_id: book?.category_id,
    department_id: book?.department?.id,
    rack_id: book?.rack?.id,
    total_copies: book?.total_copies,
    available_copies: book?.available_copies,
    price_per_copy: book?.price_per_copy ?? undefined,
    vendor_fund: book?.vendor_fund ?? undefined,
  };
}

export function BookFormModal({ open, book, onClose }: BookFormModalProps) {
  const { show } = useToast();
  const isEditing = book !== null;

  const { data: categories } = useCategories();
  const { data: departments } = useDepartments();
  const { data: racks } = useRacks({ page_size: 100 });

  const createBook = useCreateBook();
  const updateBook = useUpdateBook();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BookFormValues>({
    resolver: zodResolver(bookFormSchema),
    defaultValues: toDefaults(book),
  });

  useEffect(() => {
    reset(toDefaults(book));
  }, [book, open, reset]);

  function onSubmit(values: BookFormValues) {
    // The .refine() checks on bookFormSchema guarantee category_id and
    // total_copies are defined by the time we get here.
    const input: CreateBookInput = {
      qr_code: values.qr_code,
      title: values.title,
      category_id: values.category_id!,
      total_copies: values.total_copies!,
      author: values.author,
      isbn: values.isbn,
      publisher: values.publisher,
      edition: values.edition,
      department_id: values.department_id,
      rack_id: values.rack_id,
      available_copies: values.available_copies,
      price_per_copy: values.price_per_copy,
      vendor_fund: values.vendor_fund,
    };

    const mutation = isEditing ? updateBook.mutateAsync({ id: book.id, input }) : createBook.mutateAsync(input);

    mutation
      .then(() => {
        show(isEditing ? "Book saved — copies updated." : "Book added.", "success");
        onClose();
      })
      .catch((err: unknown) => show(friendlyError(err), "error"));
  }

  const isPending = createBook.isPending || updateBook.isPending;

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? "Edit book" : "Add book"} widthClassName="max-w-2xl">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Accession / QR code" error={errors.qr_code?.message}>
            <Input className={errors.qr_code ? "border-admin-danger" : undefined} {...register("qr_code")} />
          </FormField>
          <FormField label="Title" error={errors.title?.message}>
            <Input className={errors.title ? "border-admin-danger" : undefined} {...register("title")} />
          </FormField>
          <FormField label="Author" error={errors.author?.message}>
            <Input {...register("author", textFieldOptions)} />
          </FormField>
          <FormField label="Edition" error={errors.edition?.message}>
            <Input {...register("edition", textFieldOptions)} />
          </FormField>
          <FormField label="ISBN" error={errors.isbn?.message}>
            <Input {...register("isbn", textFieldOptions)} />
          </FormField>
          <FormField label="Publisher" error={errors.publisher?.message}>
            <Input {...register("publisher", textFieldOptions)} />
          </FormField>

          <FormField label="Category" error={errors.category_id?.message}>
            <Select
              className={errors.category_id ? "border-admin-danger" : undefined}
              {...register("category_id", numberFieldOptions)}
            >
              <option value="">Select a category</option>
              {categories?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Department" error={errors.department_id?.message}>
            <Select {...register("department_id", numberFieldOptions)}>
              <option value="">No department</option>
              {departments?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Rack" error={errors.rack_id?.message}>
            <Select {...register("rack_id", numberFieldOptions)}>
              <option value="">No rack</option>
              {racks?.data.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.rack_code}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Total copies" error={errors.total_copies?.message}>
            <Input
              type="number"
              className={errors.total_copies ? "border-admin-danger" : undefined}
              {...register("total_copies", numberFieldOptions)}
            />
          </FormField>
          <FormField
            label="Copies on shelf"
            hint="Defaults to total copies if left blank"
            error={errors.available_copies?.message}
          >
            <Input type="number" {...register("available_copies", numberFieldOptions)} />
          </FormField>
          <FormField label="Price per copy" error={errors.price_per_copy?.message}>
            <Input type="number" step="0.01" {...register("price_per_copy", numberFieldOptions)} />
          </FormField>
          <FormField label="Vendor / fund" error={errors.vendor_fund?.message}>
            <Input {...register("vendor_fund", textFieldOptions)} />
          </FormField>
        </div>

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isPending}>
            {isPending ? "Saving…" : isEditing ? "Save changes" : "Add book"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
