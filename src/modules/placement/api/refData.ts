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
    // See shared/api/departments.ts's useDepartments() for why gcTime needs
    // to be well above staleTime — same reasoning, same reference-data tier.
    gcTime: 10 * 60 * 1000,
  });
}

// Classes hits the same /classes endpoint admin already calls — reuse that
// hook (@/modules/admin/api/refData) instead of duplicating it here.
export { useClasses } from "@/modules/admin/api/refData";
// Departments is the app-wide shared lookup — reuse it here too.
export { useDepartments } from "@/modules/shared/api/departments";
