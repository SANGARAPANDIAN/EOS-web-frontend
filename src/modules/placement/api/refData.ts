import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { placementKeys } from "./queryKeys";

export interface Batch {
  id: number;
  name: string;
  start_year: number;
  end_year: number;
}

// Distinct from admin's /batches — this is the placement-scoped endpoint
// (only batches with at least one eligible/placed student), so it can't be
// swapped for admin's useBatches.
export function useBatches() {
  return useQuery({
    queryKey: placementKeys.batches(),
    queryFn: () => apiClient.get<Batch[]>("/drives/batches"),
    staleTime: 5 * 60 * 1000,
  });
}

// Departments and classes hit the same /departments and /classes endpoints
// admin already calls — reuse those hooks (@/modules/admin/api/refData)
// instead of duplicating them here.
export { useDepartments, useClasses } from "@/modules/admin/api/refData";
