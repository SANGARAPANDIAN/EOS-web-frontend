import { useQuery } from "@tanstack/react-query";
import { feedbackService, type ListFeedbackFormsParams } from "../services/feedback.service";
import { coordinatorKeys } from "../query-keys";
import type { FeedbackCourseType } from "../types";

export function useFeedbackForms(params: ListFeedbackFormsParams = {}) {
  return useQuery({
    queryKey: coordinatorKeys.feedbackForms.list(params),
    queryFn: () => feedbackService.listForms(params),
  });
}

export function useFeedbackForm(id: number | null) {
  return useQuery({
    queryKey: coordinatorKeys.feedbackForms.detail(id ?? 0),
    queryFn: () => feedbackService.getForm(id as number),
    enabled: id != null,
  });
}

export function useFeedbackResults(id: number | null) {
  return useQuery({
    queryKey: coordinatorKeys.feedbackForms.results(id ?? 0),
    queryFn: () => feedbackService.getResults(id as number),
    enabled: id != null,
  });
}

/** Reusable per-category question bank — prefills the create dialog's Questions list. */
export function useQuestionTemplates(category: FeedbackCourseType | null) {
  return useQuery({
    queryKey: coordinatorKeys.feedbackForms.questionTemplates(category ?? ""),
    queryFn: () => feedbackService.listQuestionTemplates(category as FeedbackCourseType),
    enabled: category != null,
  });
}
