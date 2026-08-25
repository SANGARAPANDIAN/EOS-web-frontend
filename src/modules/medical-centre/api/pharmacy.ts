import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface StockItem {
  id: number;
  name: string;
  use: string;
  form: string;
  qty: number;
  reorder: number;
  expiry: string | null;
  rate: number;
}

/** GET /me/medical-centre-pharmacy */
export function usePharmacyStock() {
  return useQuery({
    queryKey: ["me", "medical-centre-pharmacy"],
    queryFn: () => apiClient.get<StockItem[]>("/me/medical-centre-pharmacy"),
  });
}

/** POST /me/medical-centre-pharmacy/:id/dispense */
export function useDispenseStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, quantity }: { id: number; quantity?: number }) => apiClient.post(`/me/medical-centre-pharmacy/${id}/dispense`, { quantity }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me", "medical-centre-pharmacy"] }),
  });
}

/** POST /me/medical-centre-pharmacy/:id/restock */
export function useRestockStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, quantity }: { id: number; quantity?: number }) => apiClient.post(`/me/medical-centre-pharmacy/${id}/restock`, { quantity }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me", "medical-centre-pharmacy"] }),
  });
}

/**
 * The list endpoint returns short display names (`use`, `qty`, `reorder`,
 * `expiry`); the write endpoints take the column names. The mapping lives in
 * the page's form rather than being hidden here, so what is sent is obvious at
 * the call site.
 */
export interface StockItemInput {
  name: string;
  use_case?: string;
  form?: string;
  quantity?: number;
  reorder_level?: number;
  expiry_date?: string;
  rate?: number;
}

/** POST /me/medical-centre-pharmacy — adds a medicine line. */
export function useCreateStockItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: StockItemInput) => apiClient.post<{ id: number }>("/me/medical-centre-pharmacy", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me", "medical-centre-pharmacy"] }),
  });
}

/** PATCH /me/medical-centre-pharmacy/:id — a stock-take correction, not a dispensing. */
export function useUpdateStockItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: Partial<StockItemInput> & { id: number }) =>
      apiClient.patch(`/me/medical-centre-pharmacy/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me", "medical-centre-pharmacy"] }),
  });
}

/**
 * DELETE /me/medical-centre-pharmacy/:id
 * Refused once the medicine has been dispensed — the server explains why, so
 * that message is worth showing verbatim.
 */
export function useDeleteStockItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/me/medical-centre-pharmacy/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me", "medical-centre-pharmacy"] }),
  });
}
