import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export type FeedbackFormType = "general" | "end_semester";

export interface FeedbackFormSummary {
  id: number;
  title: string;
  form_type: FeedbackFormType;
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

/** A matrix-form question has no per-question response fields — answers live in `responses`, keyed by (mapping_id, question_id). */
export interface FeedbackMatrixQuestion {
  id: number;
  question_text: string;
  sequence_no: number;
  question_type: FeedbackQuestionType;
}

export interface FeedbackRatingScaleOption {
  value: number;
  label: string;
}

/** One matrix row — a faculty member teaching one subject to the student's class. */
export interface FeedbackMatrixRow {
  mapping_id: number;
  faculty_id: number;
  faculty_name: string;
  subject_id: number;
  subject_name: string;
}

export interface FeedbackMatrixCellResponse {
  mapping_id: number;
  question_id: number;
  rating_value: number | null;
  response_text: string | null;
}

export interface GeneralFeedbackFormDetail {
  id: number;
  title: string;
  form_type: "general";
  completed: boolean;
  questions: FeedbackQuestion[];
}

export interface EndSemesterFeedbackFormDetail {
  id: number;
  title: string;
  form_type: "end_semester";
  completed: boolean;
  questions: FeedbackMatrixQuestion[];
  rating_scale: { id: number; options: FeedbackRatingScaleOption[] } | null;
  rows: FeedbackMatrixRow[];
  responses: FeedbackMatrixCellResponse[];
}

export type FeedbackFormDetail = GeneralFeedbackFormDetail | EndSemesterFeedbackFormDetail;

/** GET /feedback/student/forms/:id */
export function useFeedbackFormDetail(formId: number) {
  return useQuery({
    queryKey: ["feedback", "student", "forms", formId],
    queryFn: () => apiClient.get<FeedbackFormDetail>(`/feedback/student/forms/${formId}`),
  });
}

export interface FeedbackResponseItem {
  question_id: number;
  /** Only set for an end_semester (matrix) form — identifies the faculty+subject row this cell answers. */
  mapping_id?: number;
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
