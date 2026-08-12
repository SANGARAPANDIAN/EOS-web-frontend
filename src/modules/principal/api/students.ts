import { useQuery } from "@tanstack/react-query";
import { apiClient, type QueryParams } from "@/lib/api/client";

export interface StudentFilters {
  batches: { id: number; name: string }[];
  departments: { id: number; name: string; code: string }[];
  sections: string[];
}

/** GET /me/principal/students/filters — real dropdown options, straight from batches/departments/classes. */
export function useStudentFilters() {
  return useQuery({
    queryKey: ["me", "principal", "students", "filters"],
    queryFn: () => apiClient.get<StudentFilters>("/me/principal/students/filters"),
  });
}

export interface StudentsSummary {
  on_roll: number;
  present_today: number;
  absent_today: number;
  attendance_percentage_today: number | null;
  students_below_threshold: number;
  fees: { students_pending: number; total_outstanding: number };
  placement: { placed: number; registered: number };
}

/** GET /me/principal/students/summary — institution-wide tiles. No CGPA/arrears figure: neither is trackable in this schema. */
export function useStudentsSummary() {
  return useQuery({
    queryKey: ["me", "principal", "students", "summary"],
    queryFn: () => apiClient.get<StudentsSummary>("/me/principal/students/summary"),
  });
}

export type StudentFeesStatus = "paid" | "partial" | "pending" | "not_billed";
export type StudentPlacementStatus = "placed" | "applied" | "not_registered";

export interface StudentRow {
  id: number;
  name: string;
  student_id_no: string;
  roll_no: string | null;
  register_no: string | null;
  batch: { id: number; name: string } | null;
  department: { id: number; name: string; code: string } | null;
  section: string | null;
  semester: number | null;
  attendance_percentage: number | null;
  fees_status: StudentFeesStatus;
  placement_status: StudentPlacementStatus;
}

export type StudentsFilterPreset = "all" | "attendance_below_75" | "fees_pending";

export interface StudentsListParams {
  q?: string;
  batch_id?: number;
  department_id?: number;
  section?: string;
  filter?: StudentsFilterPreset;
}

/** GET /me/principal/students — every active student matching the given filters, with attendance/fees/placement bulk-computed server-side. No CGPA column: not trackable in this schema, rendered as "—" client-side. */
export function useStudentsList(params: StudentsListParams) {
  return useQuery({
    queryKey: ["me", "principal", "students", "list", params],
    queryFn: () =>
      apiClient.get<{ total: number; students: StudentRow[] }>("/me/principal/students", params as QueryParams),
  });
}
