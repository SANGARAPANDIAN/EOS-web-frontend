import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface FeedbackFormSummary {
  id: number;
  title: string;
  question_count: number;
  completed: boolean;
}

/** GET /feedback/student/forms */
export function useFeedbackForms() {
  return useQuery({
    queryKey: ["feedback", "student", "forms"],
    queryFn: () => apiClient.get<FeedbackFormSummary[]>("/feedback/student/forms"),
  });
}

export type FeedbackQuestionType = "rating" | "text";

export interface FeedbackQuestion {
  id: number;
  question_text: string;
  sequence_no: number;
  question_type: FeedbackQuestionType;
  response_text: string | null;
  rating_value: number | null;
  rating_label: string | null;
}

export interface FeedbackFormDetail {
  id: number;
  title: string;
  completed: boolean;
  questions: FeedbackQuestion[];
}

/** GET /feedback/student/forms/:id */
export function useFeedbackFormDetail(formId: number) {
  return useQuery({
    queryKey: ["feedback", "student", "forms", formId],
    queryFn: () => apiClient.get<FeedbackFormDetail>(`/feedback/student/forms/${formId}`),
  });
}

interface FeedbackResponseItem {
  question_id: number;
  response_text?: string;
  rating_value?: number;
}

/** POST /feedback/student/forms/:id/responses — one-shot; the backend rejects a second submission for the same form. */
export function useSubmitFeedbackResponses(formId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (responses: FeedbackResponseItem[]) =>
      apiClient.post(`/feedback/student/forms/${formId}/responses`, { responses }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback", "student", "forms"] });
      queryClient.invalidateQueries({ queryKey: ["feedback", "student", "forms", formId] });
    },
  });
}
