import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface GraduatedBatch {
  id: number;
  batch_id: number;
  group_name: string;
  graduated_on: string;
  batch_label: string;
  member_count: number;
  latest_activity: { type: "join"; text: string; at: string } | null;
}

const KEY = ["admin", "alumni-batches"];

/** GET /admin/alumni-batches — batches that have already been graduated. */
export function useGraduatedBatches() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => apiClient.get<{ data: GraduatedBatch[]; meta: { total: number } }>("/admin/alumni-batches", { limit: 100 }),
  });
}

/** POST /admin/alumni-batches/:batchId/graduate — Admin only. */
export function useGraduateBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (batchId: number) => apiClient.post(`/admin/alumni-batches/${batchId}/graduate`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

/** GET /admin/alumni-batches/reconciliation-status */
export function useAlumniReconciliationStatus() {
  return useQuery({
    queryKey: ["admin", "alumni-reconciliation-status"],
    queryFn: () => apiClient.get<{ out_of_sync: number }>("/admin/alumni-batches/reconciliation-status"),
  });
}

/** POST /admin/alumni-batches/reconcile-roles — fixes every out-of-sync alumni login found above. */
export function useReconcileAlumniRoles() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post<{ fixed: number }>("/admin/alumni-batches/reconcile-roles", {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "alumni-reconciliation-status"] }),
  });
}
