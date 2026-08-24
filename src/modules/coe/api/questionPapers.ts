import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// src/modules/exams/question-papers/ — new, coe-only. New question_papers
// table (query.md), one row per real exam_subject_mapping (course) once a
// setter/moderator/status is recorded; courses with none yet show as
// "awaiting_upload" defaults, derived, not stored.

export type QuestionPaperStatus = "awaiting_upload" | "under_moderation" | "sealed";

export interface QuestionPaperRow {
  exam_subject_mapping_id: number;
  subject: { id: number; name: string; subject_code: string };
  department: { id: number; code: string; name: string } | null;
  semester: number | null;
  question_paper_id: number | null;
  setter: { id: number; first_name: string; last_name: string } | null;
  moderator: { id: number; first_name: string; last_name: string } | null;
  sets_count: number;
  vaulted: boolean;
  status: QuestionPaperStatus;
}

export interface QuestionPaperStats {
  required: number;
  sealed: number;
  awaiting_upload: number;
  under_moderation: number;
}

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
    enabled: examId != null,
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
    enabled: examId != null,
  });
}

export function useUpsertQuestionPaper() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { exam_subject_mapping_id: number; setter_faculty_id?: number; moderator_faculty_id?: number; sets_count?: number; status?: QuestionPaperStatus }) =>
      apiClient.post("/question-papers", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coe", "question-papers"] });
      queryClient.invalidateQueries({ queryKey: ["coe", "question-paper-stats"] });
    },
  });
}
