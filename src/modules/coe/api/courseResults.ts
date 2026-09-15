import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// src/modules/exams/course-results/ — new, coe-only. New course_result_status
// table (query.md) layered over real exam_marks/grade_bands/exam_pass_rules_settings.

export type CourseResultStatus = "computed" | "awaiting_pass_board" | "approved" | "published";

export interface CourseResultRow {
  exam_subject_mapping_id: number;
  subject: { id: number; name: string; subject_code: string };
  department: { id: number; code: string; name: string } | null;
  department_id: number | null;
  semester: number | null;
  appeared: number;
  passed: number;
  pass_pct: number;
  highest_gpa: number | null;
  status: CourseResultStatus;
  withheld_reason: string | null;
}

export interface CourseResultStats {
  total_courses: number;
  published_count: number;
  overall_pass_pct: number;
  pass_pct_delta: number | null;
  awaiting_approval_count: number;
  board_meeting_at: string | null;
  withheld_count: number;
  withheld_malpractice_count: number;
  withheld_other_count: number;
}

export interface CourseResultFilters {
  department_id?: number | null;
  semester?: number | null;
  status?: CourseResultStatus | null;
  search?: string;
}

export function useCourseResults(examId: number | null, filters: CourseResultFilters = {}) {
  return useQuery({
    queryKey: ["coe", "course-results", examId, filters.department_id ?? null, filters.semester ?? null, filters.status ?? null, filters.search ?? ""],
    queryFn: () =>
      apiClient.get<CourseResultRow[]>("/course-results", {
        exam_id: examId ?? undefined,
        department_id: filters.department_id ?? undefined,
        semester: filters.semester ?? undefined,
        status: filters.status ?? undefined,
        search: filters.search || undefined,
      }),
    enabled: examId != null,
  });
}

export function useCourseResultStats(examId: number | null) {
  return useQuery({
    queryKey: ["coe", "course-result-stats", examId],
    queryFn: () => apiClient.get<CourseResultStats>("/course-results/stats", { exam_id: examId ?? undefined }),
    enabled: examId != null,
  });
}

export interface CourseResultAnalysis {
  subject: { id: number; name: string; subject_code: string };
  department: { id: number; code: string; name: string } | null;
  total_appeared: number;
  absent: number;
  passed: number;
  failed: number;
  average_marks: number;
  highest_marks: number | null;
  lowest_marks: number | null;
  max_marks: number;
  grade_distribution: { grade: string; count: number }[];
}

export function useCourseResultAnalysis(mappingId: number | null) {
  return useQuery({
    queryKey: ["coe", "course-result-analysis", mappingId],
    queryFn: () => apiClient.get<CourseResultAnalysis>(`/course-results/${mappingId}/analysis`),
    enabled: mappingId != null,
  });
}

function invalidate(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["coe", "course-results"] });
  queryClient.invalidateQueries({ queryKey: ["coe", "course-result-stats"] });
}

export function useComputeCourseResult() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mappingId: number) => apiClient.post(`/course-results/${mappingId}/compute`),
    onSuccess: () => invalidate(queryClient),
  });
}

export function useApproveCourseResult() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mappingId: number) => apiClient.post(`/course-results/${mappingId}/approve`),
    onSuccess: () => invalidate(queryClient),
  });
}

export function usePublishCourseResult() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mappingId: number) => apiClient.post(`/course-results/${mappingId}/publish`),
    onSuccess: () => invalidate(queryClient),
  });
}
