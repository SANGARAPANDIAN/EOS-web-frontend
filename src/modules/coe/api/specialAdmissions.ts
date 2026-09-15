import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// src/modules/exams/special-admissions/ — new, coe-only. Built entirely over
// real fields already on `students` (admission_type/joined_academic_year —
// same ones Admin's admission wizard writes) plus real counts joined from
// exam_marks/malpractice_incidents/revaluation_requests — no schema change.
// "Lateral entry" is the exact real admission_type value; "Transfer" is
// derived — a real joined_academic_year that doesn't match the student's own
// real batch start year. The ADMIN-only /students controller is untouched.

export type SpecialAdmissionCategory = "lateral_entry" | "transfer";

export interface SpecialAdmissionStudent {
  id: number;
  student_id_no: string;
  register_no: string | null;
  roll_no: string | null;
  name: string | null;
  admission_type: string | null;
  joined_academic_year: string | null;
  category: SpecialAdmissionCategory;
  department: { id: number; code: string; name: string } | null;
  class: { id: number; section: string; current_semester: number | null } | null;
  batch: { name: string; expected_academic_year: string };
  papers_with_marks: number;
  malpractice_count: number;
  revaluation_count: number;
}

export interface SpecialAdmissionsResponse {
  data: SpecialAdmissionStudent[];
  stats: { total: number; lateral_entry_count: number; transfer_count: number };
}

export interface SpecialAdmissionsFilters {
  department_id?: number | null;
  class_id?: number | null;
  category?: SpecialAdmissionCategory | null;
  search?: string;
}

export function useSpecialAdmissionStudents(filters: SpecialAdmissionsFilters) {
  return useQuery({
    queryKey: ["coe", "special-admissions", filters.department_id ?? null, filters.class_id ?? null, filters.category ?? null, filters.search ?? ""],
    queryFn: () =>
      apiClient.get<SpecialAdmissionsResponse>("/special-admissions", {
        department_id: filters.department_id ?? undefined,
        class_id: filters.class_id ?? undefined,
        category: filters.category ?? undefined,
        search: filters.search || undefined,
      }),
  });
}

export function useNotifySpecialAdmissionStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ studentId, title, message }: { studentId: number; title: string; message: string }) =>
      apiClient.post<{ notified: boolean }>(`/special-admissions/${studentId}/notify`, { title, message }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["coe", "special-admissions"] }),
  });
}
