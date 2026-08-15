import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { libraryKeys } from "@/modules/library/api/queryKeys";

export interface DashboardSummary {
  total_books: number;
  available_books: number;
  total_ebooks: number;
  active_borrowings: number;
  overdue_books: number;
  lost_books: number;
  damaged_books: number;
}

export function useDashboardSummary() {
  return useQuery({
    queryKey: libraryKeys.dashboard(),
    queryFn: () => apiClient.get<DashboardSummary>("/library/dashboard/summary"),
  });
}
