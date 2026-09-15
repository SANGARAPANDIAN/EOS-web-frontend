import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { Exam } from "@/modules/coe/api/exams";

// src/modules/exams/results/results.controller.ts — this is purely a
// "has this exam's results been published" marker. Pass %, arrears,
// moderation and rank holders are real too, via GET /marks-roster/
// results-summary — computed from real internal+external marks (see that
// module). There is still no CGPA anywhere in the schema (no grade-point
// table), so "average score" is a real average-percentage figure, not a
// fabricated CGPA.

export type PublicationType = "original" | "revaluation";
export type PublicationState = "embargo" | "live" | "held_back";

export interface ResultPublicationScope {
  departments: string[];
  label: string;
  candidates: number;
}

export interface ResultPublicationWithheld {
  malpractice: number;
  dues: number;
  total: number;
}

export interface ResultPublication {
  id: number;
  exam_id: number;
  publication_type: PublicationType;
  published_by_user_id: number | null;
  published_at: string;
  scheduled_release_at: string | null;
  channels: string | null;
  state: PublicationState;
  exams: Exam;
  users: { id: number; email: string; role_id: number; status: string };
  scope: ResultPublicationScope;
  withheld: ResultPublicationWithheld;
  can_rollback: boolean;
}

export function useResultPublications() {
  return useQuery({
    queryKey: ["coe", "results"],
    queryFn: () => apiClient.get<ResultPublication[]>("/results"),
  });
}

export interface ResultPublicationStats {
  sets_published: number;
  under_embargo: number;
  nearest_embargo_release: string | null;
  withheld_total: number;
  withheld_malpractice: number;
  withheld_dues: number;
  candidates_covered: number;
  live_set_count: number;
}

export function useResultPublicationStats() {
  return useQuery({
    queryKey: ["coe", "results", "stats"],
    queryFn: () => apiClient.get<ResultPublicationStats>("/results/stats"),
  });
}

/** POST /exams/:id/results/publish — 409 MARKS_INCOMPLETE if any exam_subject_mapping for this exam has zero exam_marks rows; 409 ALREADY_PUBLISHED if already published. */
export function usePublishResults() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (examId: number) => apiClient.post<ResultPublication>(`/exams/${examId}/results/publish`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["coe", "results"] }),
  });
}

export function useScheduleResultRelease() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number; scheduled_release_at?: string; channels?: string; state?: PublicationState }) =>
      apiClient.patch<ResultPublication>(`/results/${id}/schedule`, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["coe", "results"] }),
  });
}

export interface DepartmentPassRate {
  department_code: string;
  pass_percentage: number;
  candidates: number;
}

export interface RankHolder {
  student_id: number;
  register_no: string;
  name: string | null;
  department_code: string;
  score: number;
}

export interface ResultsSummary {
  exam_id: number;
  pass_rules_configured: boolean;
  candidates_evaluated: number;
  overall_pass_percentage: number | null;
  average_percentage: number | null;
  arrears_count: number;
  papers_with_arrears: number;
  papers_moderated: number;
  candidates_with_grace_marks: number;
  department_breakdown: DepartmentPassRate[];
  rank_holders: RankHolder[];
}

export function useResultsSummary(examId: number | null) {
  return useQuery({
    queryKey: ["coe", "results-summary", examId],
    queryFn: () => apiClient.get<ResultsSummary>("/marks-roster/results-summary", { exam_id: examId ?? undefined }),
    enabled: examId != null,
  });
}
