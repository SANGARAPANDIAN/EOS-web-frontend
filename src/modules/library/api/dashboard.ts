import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { libraryKeys } from "@/modules/library/api/queryKeys";

export interface DepartmentAvailability {
  department: string;
  department_code: string;
  available_copies: number;
  total_copies: number;
}

export interface RecentActivityEvent {
  id: string;
  type: "borrowed" | "returned" | "lost" | "damaged";
  person: string;
  book_title: string;
  date: string;
}

export interface DashboardSummary {
  total_books: number;
  available_books: number;
  total_ebooks: number;
  active_borrowings: number;
  overdue_books: number;
  lost_books: number;
  damaged_books: number;
  today: {
    issued: number;
    due: number;
    returned: number;
  };
  department_availability: DepartmentAvailability[];
  recent_activity: RecentActivityEvent[];
}

export function useDashboardSummary() {
  return useQuery({
    queryKey: libraryKeys.dashboard(),
    queryFn: () => apiClient.get<DashboardSummary>("/library/dashboard/summary"),
  });
}
