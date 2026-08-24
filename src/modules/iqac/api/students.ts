import { useQuery } from "@tanstack/react-query";
import { apiClient, type QueryParams } from "@/lib/api/client";

export interface StudentFilters {
  batches: { id: number; name: string }[];
  departments: { id: number; name: string; code: string }[];
  sections: string[];
}

/** GET /me/iqac/students/filters — real dropdown options, straight from batches/departments/classes. */
export function useStudentFilters() {
  return useQuery({
    queryKey: ["me", "iqac", "students", "filters"],
    queryFn: () => apiClient.get<StudentFilters>("/me/iqac/students/filters"),
  });
}

export type StudentFeesStatus = "paid" | "partial" | "pending" | "not_billed";
export type StudentPlacementStatus = "placed" | "applied" | "not_registered";

export type StudentStatus = "active" | "inactive";

export interface StudentRow {
  id: number;
  name: string;
  student_id_no: string;
  roll_no: string | null;
  register_no: string | null;
  status: StudentStatus;
  batch: { id: number; name: string } | null;
  department: { id: number; name: string; code: string } | null;
  section: string | null;
  semester: number | null;
  attendance_percentage: number | null;
  fees_status: StudentFeesStatus;
  placement_status: StudentPlacementStatus;
  mentor: { id: number; name: string } | null;
  /** true = at least one real exam_marks row fails the grade_bands pass rule; null = no exam_marks on file, arrears status genuinely unknown. */
  has_arrears: boolean | null;
  /** Mean of grade_bands.grade_point across every real graded exam_marks row on file — the same methodology the Grade-distribution page uses, scoped to one student. Not a formal credit-weighted CGPA. Null = no exam_marks on file. */
  mean_grade_point: number | null;
}

export type StudentsFilterPreset = "all" | "attendance_below_75" | "fees_pending";

export interface StudentsListParams {
  q?: string;
  batch_id?: number;
  department_id?: number;
  section?: string;
  filter?: StudentsFilterPreset;
  /** Omit for the default (active only) — pass 'all' to also see inactive students. */
  status?: StudentStatus | "all";
}

/** GET /me/iqac/students — every active student matching the given filters, with attendance/fees/placement/mentor/arrears/mean_grade_point bulk-computed server-side. mean_grade_point is a real mean grade point from grade_bands, not a formal credit-weighted CGPA (subjects.credits is nullable/inconsistent, and exam_marks has no internal/external split). */
export function useStudentsList(params: StudentsListParams) {
  return useQuery({
    queryKey: ["me", "iqac", "students", "list", params],
    queryFn: () =>
      apiClient.get<{ total: number; students: StudentRow[] }>("/me/iqac/students", params as QueryParams),
  });
}
