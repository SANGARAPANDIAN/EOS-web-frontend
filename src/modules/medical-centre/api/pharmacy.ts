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
