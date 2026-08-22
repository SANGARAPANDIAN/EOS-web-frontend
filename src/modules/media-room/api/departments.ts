import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface Department {
  id: number;
  name: string;
  code: string;
}

/** GET /departments — public lookup, no role gate. */
export function useDepartments() {
  return useQuery({
    queryKey: ["departments"],
    queryFn: () => apiClient.get<Department[]>("/departments"),
    staleTime: 10 * 60_000,
  });
}
