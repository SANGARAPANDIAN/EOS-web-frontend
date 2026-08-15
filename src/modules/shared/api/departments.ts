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
  });
}
