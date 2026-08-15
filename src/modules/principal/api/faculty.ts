import { useQuery } from "@tanstack/react-query";
import { apiClient, type QueryParams } from "@/lib/api/client";

export interface FacultyFilters {
  departments: { id: number; name: string; code: string }[];
}

/** GET /me/principal/faculty/filters — real departments only. */
export function useFacultyFilters() {
  return useQuery({
    queryKey: ["me", "principal", "faculty", "filters"],
    queryFn: () => apiClient.get<FacultyFilters>("/me/principal/faculty/filters"),
  });
}

export interface FacultySummary {
  teaching_total: number;
  non_teaching_total: number;
  on_duty: { reported_today: number; on_leave_today: number; total_active: number };
  leave_requests_pending: number;
  appraisals: { closed: number; total: number };
  payroll: { month_label: string; processed_count: number; total_count: number; processed_amount: number };
}

/** GET /me/principal/faculty/summary — institution-wide tiles. */
export function useFacultySummary() {
  return useQuery({
    queryKey: ["me", "principal", "faculty", "summary"],
    queryFn: () => apiClient.get<FacultySummary>("/me/principal/faculty/summary"),
  });
}

export interface FacultyDepartmentStrengthRow {
  department: { id: number; name: string; code: string };
  teaching: number;
  support: number;
  avg_workload_hours: number | null;
  attendance_percentage: number | null;
}

/** GET /me/principal/faculty/department-strength */
export function useFacultyDepartmentStrength() {
  return useQuery({
    queryKey: ["me", "principal", "faculty", "department-strength"],
    queryFn: () =>
      apiClient.get<{ departments: FacultyDepartmentStrengthRow[]; support_unassigned: number }>(
        "/me/principal/faculty/department-strength",
      ),
  });
}

export interface FacultyRow {
  id: number;
  name: string;
  designation: string;
  department: { id: number; name: string; code: string } | null;
  qualification: string | null;
  experience_years: number | null;
  classes_count: number;
  attendance_percentage: number | null;
  email: string;
  phone: string | null;
}

export interface FacultyListParams {
  q?: string;
  department_id?: number;
}

/** GET /me/principal/faculty — every active faculty member matching the given filters. */
export function useFacultyList(params: FacultyListParams) {
  return useQuery({
    queryKey: ["me", "principal", "faculty", "list", params],
    queryFn: () =>
      apiClient.get<{ total: number; faculty: FacultyRow[] }>("/me/principal/faculty", params as QueryParams),
  });
}
