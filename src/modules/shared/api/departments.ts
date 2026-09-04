import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface DepartmentRow {
  id: number;
  name: string;
  code: string;
}

/**
 * GET /departments — institution-wide department catalogue (unfiltered).
 * Public master-data endpoint, no role guard; cached long since departments
 * essentially never change mid-semester.
 */
export function useDepartments() {
  return useQuery({
    queryKey: ["departments", "lookup"],
    queryFn: () => apiClient.get<DepartmentRow[]>("/departments"),
    staleTime: 30 * 60_000,
    // Without this, the cache entry is garbage-collected 5 minutes (React
    // Query's default gcTime) after the last component using it unmounts —
    // silently defeating the 30-minute staleTime above the moment a user
    // navigates away and back after that. Set well above staleTime so the
    // long staleTime actually pays off across normal navigation.
    gcTime: 60 * 60_000,
  });
}
