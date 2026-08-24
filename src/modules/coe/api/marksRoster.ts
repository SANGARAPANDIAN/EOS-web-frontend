import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// src/modules/exams/marks-roster/ — new, coe-only, read-only aggregation
// over exam_subject_mapping/exam_marks/students/soa_applications/
// exam_pass_rules_settings/marks_entry_locks. No schema change.

export interface RosterEntry {
  student_id: number;
  register_no: string | null;
  roll_no: string | null;
  name: string | null;
  internal: { marks_obtained: number | null; max_marks: number; is_absent: boolean } | null;
  external: { id: number; marks_obtained: number | null; max_marks: number; is_absent: boolean } | null;
  total: number | null;
  grade: string | null;
}

export interface MarksRoster {
  mapping: {
    id: number;
    exam_id: number;
    subject_code: string;
    subject_name: string;
    is_published: boolean;
    section: string;
    semester: number | null;
    department_code: string;
    department_name: string;
    department_id: number;
    batch_name: string;
    academic_year: string;
    exam_type_name: string;
  };
  pass_rules: { internal_max_marks: number; external_max_marks: number; pass_mark_total: number; min_external_marks: number } | null;
  has_internal_mapping: boolean;
  is_locked: boolean;
  entries_recorded: number;
  total_students: number;
  roster: RosterEntry[];
}

export function useMarksRoster(examSubjectMappingId?: number | null) {
  return useQuery({
    queryKey: ["coe", "marks-roster", examSubjectMappingId],
    queryFn: () => apiClient.get<MarksRoster>("/marks-roster", { exam_subject_mapping_id: examSubjectMappingId ?? undefined }),
    enabled: examSubjectMappingId != null,
  });
}

export interface GradeMatrixRow {
  student_id: number;
  register_no: string | null;
  name: string | null;
  section: string | null;
  department_code: string | null;
  grades: Record<number, string | null>;
}

export interface GradeMatrix {
  department_id: number;
  papers: { subject_id: number; subject_code: string; subject_name: string }[];
  students: GradeMatrixRow[];
}

export function useGradeMatrix(params: { exam_id?: number | null; department_id?: number | null }) {
  return useQuery({
    queryKey: ["coe", "grade-matrix", params.exam_id ?? null, params.department_id ?? null],
    queryFn: () =>
      apiClient.get<GradeMatrix>("/marks-roster/grade-matrix", {
        exam_id: params.exam_id ?? undefined,
        department_id: params.department_id ?? undefined,
      }),
    enabled: params.exam_id != null && params.department_id != null,
  });
}

export interface MarksEntryLock {
  id: number;
  exam_id: number;
  department_id: number;
  is_locked: boolean;
  locked_by_user_id: number | null;
  locked_at: string | null;
}

export function useSetMarksEntryLock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { exam_id: number; department_id: number; is_locked: boolean }) =>
      apiClient.post<MarksEntryLock>("/marks-entry-locks", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["coe", "marks-roster"] }),
  });
}

export interface DepartmentCompletion {
  department_id: number;
  department_code: string;
  department_name: string;
  percent: number;
  entries_recorded: number;
  entries_expected: number;
}

export interface DepartmentCompletionResponse {
  exam_id: number | null;
  departments: DepartmentCompletion[];
}

/**
 * GET /marks-roster/department-completion — real entries-recorded ÷
 * expected per department. With no exam_id given, the backend picks the
 * most recent exam whose timetable has actually run.
 */
export function useDepartmentCompletion() {
  return useQuery({
    queryKey: ["coe", "department-completion"],
    queryFn: () => apiClient.get<DepartmentCompletionResponse>("/marks-roster/department-completion"),
  });
}
