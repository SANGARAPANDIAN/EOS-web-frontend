import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// src/modules/exams/question-papers/ — new, coe-only. New question_papers
// table (query.md), one row per real exam_subject_mapping (course) once a
// setter/moderator/status is recorded; courses with none yet show as
// "awaiting_upload" defaults, derived, not stored.

export type QuestionPaperStatus = "awaiting_upload" | "under_moderation" | "sealed";

export interface QuestionPaperRow {
  exam_subject_mapping_id: number;
  exam_id: number;
  subject: { id: number; name: string; subject_code: string };
  department: { id: number; code: string; name: string } | null;
  semester: number | null;
  question_paper_id: number | null;
  setter: { id: number; first_name: string; last_name: string } | null;
  moderator: { id: number; first_name: string; last_name: string } | null;
  sets_count: number;
  vaulted: boolean;
  status: QuestionPaperStatus;
  due_date: string | null;
}

export interface QuestionPaperStats {
  required: number;
  sealed: number;
  awaiting_upload: number;
  awaiting_without_setter: number;
  awaiting_flagged: number;
  under_moderation: number;
  distribution_ready: number;
  distribution_total: number;
}

/** examId null = every exam ("All exams" in the filter) — a valid, always-enabled state, not a not-ready-yet state. */
export function useQuestionPapers(examId: number | null, filters: { department_id?: number | null; status?: QuestionPaperStatus | null; search?: string }) {
  return useQuery({
    queryKey: ["coe", "question-papers", examId, filters.department_id ?? null, filters.status ?? null, filters.search ?? ""],
    queryFn: () =>
      apiClient.get<QuestionPaperRow[]>("/question-papers", {
        exam_id: examId ?? undefined,
        department_id: filters.department_id ?? undefined,
        status: filters.status ?? undefined,
        search: filters.search || undefined,
      }),
  });
}

/** GET /question-papers/count — real question_papers rows recorded across every exam. Used only for the sidebar nav badge. */
export function useQuestionPapersTotalCount() {
  return useQuery({
    queryKey: ["coe", "question-papers-count"],
    queryFn: () => apiClient.get<{ total: number }>("/question-papers/count"),
    staleTime: 60 * 1000,
  });
}

export function useQuestionPaperStats(examId: number | null) {
  return useQuery({
    queryKey: ["coe", "question-paper-stats", examId],
    queryFn: () => apiClient.get<QuestionPaperStats>("/question-papers/stats", { exam_id: examId ?? undefined }),
  });
}

export function useUpsertQuestionPaper() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      exam_subject_mapping_id: number;
      setter_faculty_id?: number;
      moderator_faculty_id?: number;
      sets_count?: number;
      status?: QuestionPaperStatus;
      due_date?: string;
    }) => apiClient.post("/question-papers", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coe", "question-papers"] });
      queryClient.invalidateQueries({ queryKey: ["coe", "question-paper-stats"] });
    },
  });
}

/** POST /question-papers/:examSubjectMappingId/remind — nudges the assigned setter; throws NO_SETTER_ASSIGNED if no setter has been recorded for that course yet. */
export function useRemindQuestionPaperSetter() {
  return useMutation({
    mutationFn: (examSubjectMappingId: number) => apiClient.post(`/question-papers/${examSubjectMappingId}/remind`),
  });
}
