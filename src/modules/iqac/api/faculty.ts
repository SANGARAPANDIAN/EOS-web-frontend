import { useQuery } from "@tanstack/react-query";
import { apiClient, type QueryParams } from "@/lib/api/client";

export interface FacultyFilters {
  departments: { id: number; name: string; code: string }[];
}

/** GET /me/iqac/faculty/filters — real departments only. */
export function useFacultyFilters() {
  return useQuery({
    queryKey: ["me", "iqac", "faculty", "filters"],
    queryFn: () => apiClient.get<FacultyFilters>("/me/iqac/faculty/filters"),
  });
}

export type FacultyStatus = "active" | "inactive";

export interface FacultyRow {
  id: number;
  name: string;
  designation: string;
  staff_code: string | null;
  department: { id: number; name: string; code: string } | null;
  qualification: string | null;
  has_doctorate: boolean;
  experience_years: number | null;
  classes_count: number;
  attendance_percentage: number | null;
  publications_count: number;
  status: FacultyStatus;
  email: string;
  phone: string | null;
}

export interface FacultyListParams {
  q?: string;
  department_id?: number;
  /** Omit for the default (active only) — pass 'all' to also see inactive faculty. */
  status?: FacultyStatus | "all";
}

/** GET /me/iqac/faculty — every faculty member matching the given filters, with classes-taught/attendance/publications bulk-computed server-side. No FDP-count column: no real table tracks faculty development programme attendance. */
export function useFacultyList(params: FacultyListParams) {
  return useQuery({
    queryKey: ["me", "iqac", "faculty", "list", params],
    queryFn: () => apiClient.get<{ total: number; faculty: FacultyRow[] }>("/me/iqac/faculty", params as QueryParams),
  });
}
