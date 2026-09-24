import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { stationeryStoreKeys } from "./queryKeys";

// Backend reference: EOSbackend1/src/modules/stationery/stationery-admin.controller.ts
// + stationery.service.ts. Distinct from the print-shop's stationary_stock_items
// (@/modules/stationary) — this is the shopping-cart Stationery Store's own
// product catalogue, the same table the mobile app's Stationery Store tab reads.

export type StationeryCategory = "study" | "food" | "care" | "hostel" | "college";

export const STATIONERY_CATEGORIES: { id: StationeryCategory; name: string }[] = [
  { id: "study", name: "Study Essentials" },
  { id: "food", name: "Food & Snacks" },
  { id: "care", name: "Personal Care" },
  { id: "hostel", name: "Hostel Essentials" },
  { id: "college", name: "College Essentials" },
];

export const CATEGORY_NAME: Record<StationeryCategory, string> = STATIONERY_CATEGORIES.reduce(
  (acc, c) => ({ ...acc, [c.id]: c.name }),
  {} as Record<StationeryCategory, string>,
);

export interface StationeryProduct {
  id: number;
  category: StationeryCategory;
  name: string;
  description: string | null;
  specs: string[];
  price: number;
  original_price: number | null;
  stock_quantity: number;
  image_url: string | null;
  is_active: boolean;
  low_stock_threshold: number;
  created_at: string;
  updated_at: string;
}

export interface ProductFormInput {
  category: StationeryCategory;
  name: string;
  description?: string;
  specs?: string[];
  price: number;
  original_price?: number;
  stock_quantity: number;
  image_url?: string;
  low_stock_threshold?: number;
}

export type UpdateProductInput = Partial<ProductFormInput> & { is_active?: boolean };

const BASE = "/stationery/admin/products";

/** GET /stationery/admin/products — includes inactive products, unlike the public catalogue. */
export function useStationeryProducts() {
  return useQuery({
    queryKey: stationeryStoreKeys.products.all(),
    queryFn: () => apiClient.get<StationeryProduct[]>(BASE),
  });
}

export function useCreateStationeryProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ProductFormInput) => apiClient.post<StationeryProduct>(BASE, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stationeryStoreKeys.products.all() });
      queryClient.invalidateQueries({ queryKey: stationeryStoreKeys.dashboard() });
    },
  });
}

export function useUpdateStationeryProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateProductInput }) =>
      apiClient.patch<StationeryProduct>(`${BASE}/${id}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stationeryStoreKeys.products.all() });
      queryClient.invalidateQueries({ queryKey: stationeryStoreKeys.dashboard() });
    },
  });
}

/**
 * POST /stationery/admin/products/image-upload — standalone, no product id
 * required (the Add-product form has no id yet). Returns a public URL to
 * pass straight into the create/update payload's own image_url field.
 */
export function useUploadStationeryProductImage() {
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return apiClient.uploadFile<{ image_url: string }>(`${BASE}/image-upload`, formData);
    },
  });
}

/**
 * DELETE /stationery/admin/products/:id/permanent — a real hard delete,
 * only allowed for a product with zero order history (the backend 400s
 * with PRODUCT_HAS_ORDERS otherwise — surface that message rather than
 * retrying).
 */
export function useDeleteStationeryProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete<{ id: number }>(`${BASE}/${id}/permanent`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stationeryStoreKeys.products.all() });
      queryClient.invalidateQueries({ queryKey: stationeryStoreKeys.dashboard() });
    },
  });
}

/** DELETE /stationery/admin/products/:id — soft delete (is_active=false), same as toggling active off. */
export function useSetStationeryProductActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      active
        ? apiClient.patch<StationeryProduct>(`${BASE}/${id}`, { is_active: true })
        : apiClient.delete<StationeryProduct>(`${BASE}/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stationeryStoreKeys.products.all() });
      queryClient.invalidateQueries({ queryKey: stationeryStoreKeys.dashboard() });
    },
  });
}
