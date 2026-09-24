"use client";

import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal, Button, FormField, Input, Select, useToast } from "@/modules/admin/components/ui";
import { friendlyError } from "@/lib/utils/errors";
import { numberFieldOptions, textFieldOptions } from "@/lib/utils/rhf-helpers";
import {
  STATIONERY_CATEGORIES,
  useCreateStationeryProduct,
  useUpdateStationeryProduct,
  useUploadStationeryProductImage,
  type ProductFormInput,
  type StationeryProduct,
} from "@/modules/stationery-store/api/products";
import { productFormSchema, type ProductFormValues } from "@/modules/stationery-store/schemas/product-form.schema";

interface ProductFormModalProps {
  open: boolean;
  product: StationeryProduct | null;
  onClose: () => void;
}

function toDefaults(product: StationeryProduct | null): ProductFormValues {
  return {
    category: product?.category,
    name: product?.name ?? "",
    price: product?.price,
    original_price: product?.original_price ?? undefined,
    stock_quantity: product?.stock_quantity,
    low_stock_threshold: product?.low_stock_threshold ?? 10,
    image_url: product?.image_url ?? undefined,
  };
}

export function ProductFormModal({ open, product, onClose }: ProductFormModalProps) {
  const { show } = useToast();
  const isEditing = product !== null;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createProduct = useCreateStationeryProduct();
  const updateProduct = useUpdateStationeryProduct();
  const uploadImage = useUploadStationeryProductImage();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: toDefaults(product),
  });

  useEffect(() => {
    reset(toDefaults(product));
  }, [product, open, reset]);

  const imageUrl = watch("image_url");

  function handlePickImage(file: File | undefined) {
    if (!file) return;
    uploadImage.mutate(file, {
      onSuccess: ({ image_url }) => setValue("image_url", image_url),
      onError: (err: unknown) => show(friendlyError(err), "error"),
    });
  }

  function onSubmit(values: ProductFormValues) {
    // The .refine() checks on productFormSchema guarantee category, price
    // and stock_quantity are defined by the time we get here.
    const input: ProductFormInput = {
      category: values.category!,
      name: values.name,
      price: values.price!,
      original_price: values.original_price,
      stock_quantity: values.stock_quantity!,
      low_stock_threshold: values.low_stock_threshold,
      image_url: values.image_url,
    };

    const mutation = isEditing ? updateProduct.mutateAsync({ id: product.id, input }) : createProduct.mutateAsync(input);

    mutation
      .then(() => {
        show(isEditing ? "Product saved." : "Product added.", "success");
        onClose();
      })
      .catch((err: unknown) => show(friendlyError(err), "error"));
  }

  const isPending = createProduct.isPending || updateProduct.isPending;

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? "Edit product" : "Add product"} widthClassName="max-w-2xl">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormField label="Product name" error={errors.name?.message}>
          <Input className={errors.name ? "border-admin-danger" : undefined} {...register("name")} />
        </FormField>

        <FormField label="Category" error={errors.category?.message}>
          <Select className={errors.category ? "border-admin-danger" : undefined} {...register("category", textFieldOptions)}>
            <option value="">Select category</option>
            {STATIONERY_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Price (₹)" error={errors.price?.message}>
            <Input type="number" step="0.01" className={errors.price ? "border-admin-danger" : undefined} {...register("price", numberFieldOptions)} />
          </FormField>
          <FormField label="Original price (₹)" hint="For a strikethrough discount — must exceed price" error={errors.original_price?.message}>
            <Input type="number" step="0.01" {...register("original_price", numberFieldOptions)} />
          </FormField>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Stock quantity" error={errors.stock_quantity?.message}>
            <Input type="number" className={errors.stock_quantity ? "border-admin-danger" : undefined} {...register("stock_quantity", numberFieldOptions)} />
          </FormField>
          <FormField label="Low-stock threshold" hint="Flags on the dashboard once stock falls to/below this">
            <Input type="number" {...register("low_stock_threshold", numberFieldOptions)} />
          </FormField>
        </div>

        <FormField label="Photo (optional)" hint="JPG, PNG or WebP, up to 5MB — shown as initials if left blank">
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              handlePickImage(file);
            }}
          />
          <div className="flex items-center gap-3">
            {imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- a remote/preview URL, not a local/optimizable asset
              <img src={imageUrl} alt="" className="size-11 shrink-0 rounded-admin-sm border border-admin-border object-cover" />
            )}
            <button
              type="button"
              disabled={uploadImage.isPending}
              onClick={() => fileInputRef.current?.click()}
              className="w-fit rounded-admin-sm border border-admin-border-hover px-3 py-1.5 text-[13px] font-semibold text-admin-ink hover:bg-admin-tint-strong disabled:opacity-60"
            >
              {uploadImage.isPending ? "Uploading…" : imageUrl ? "Replace photo" : "Upload photo"}
            </button>
            {imageUrl && !uploadImage.isPending && (
              <button
                type="button"
                onClick={() => setValue("image_url", undefined)}
                className="text-[13px] font-semibold text-admin-muted hover:text-admin-ink"
              >
                Remove
              </button>
            )}
          </div>
        </FormField>

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isPending}>
            {isPending ? "Saving…" : isEditing ? "Save changes" : "Add product"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
