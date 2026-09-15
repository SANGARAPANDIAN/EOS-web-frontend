import { apiClient } from "@/lib/api/client";
import type {
  CreateFeedbackFormInput,
  FeedbackCourseType,
  FeedbackForm,
  FeedbackFormDetail,
  FeedbackQuestion,
  FeedbackQuestionInput,
  FeedbackQuestionTemplate,
  FeedbackResults,
  PaginatedResponse,
  UpdateFeedbackFormInput,
} from "../types";

interface BackendFeedbackQuestion {
  id: number;
  form_id: number;
  question_text: string;
  question_type: "rating" | "text";
  sequence_no: number;
}

interface BackendFeedbackForm {
  id: number;
  title: string;
  form_type: "general" | "end_semester";
  class_id: number | null;
  batch_id: number | null;
  rating_scale_id: number | null;
  created_by_user_id: number;
  created_at: string;
  batches?: { id: number; name: string } | null;
  classes?: { id: number; section: string } | null;
  _count?: { feedback_questions: number };
  feedback_questions?: BackendFeedbackQuestion[];
  category?: FeedbackCourseType | null;
  is_published?: boolean;
}

interface BackendQuestionTemplate {
  id: number;
  question_text: string;
  is_optional: boolean;
  display_order: number;
}

function toQuestionTemplate(t: BackendQuestionTemplate): FeedbackQuestionTemplate {
  return { id: t.id, questionText: t.question_text, isOptional: t.is_optional, displayOrder: t.display_order };
}

function toQuestion(q: BackendFeedbackQuestion): FeedbackQuestion {
  return { id: q.id, form_id: q.form_id, question_text: q.question_text, question_type: q.question_type, sequence_no: q.sequence_no };
}

function toForm(f: BackendFeedbackForm): FeedbackForm {
  return {
    id: f.id,
    title: f.title,
    form_type: f.form_type,
    class_id: f.class_id,
    batch_id: f.batch_id,
    rating_scale_id: f.rating_scale_id,
    created_by_user_id: f.created_by_user_id,
    created_at: f.created_at,
    batchName: f.batches?.name ?? null,
    classSection: f.classes?.section ?? null,
    questionCount: f._count?.feedback_questions ?? f.feedback_questions?.length ?? 0,
    category: f.category ?? null,
    isPublished: f.is_published ?? true,
  };
}

function toFormDetail(f: BackendFeedbackForm): FeedbackFormDetail {
  return { ...toForm(f), questions: (f.feedback_questions ?? []).map(toQuestion) };
}

export type ListFeedbackFormsParams = {
  batch_id?: number;
  class_id?: number;
  page?: number;
  limit?: number;
};

export const feedbackService = {
  async listForms(params: ListFeedbackFormsParams = {}): Promise<PaginatedResponse<FeedbackForm>> {
    const res = await apiClient.get<{ data: BackendFeedbackForm[]; meta: PaginatedResponse<FeedbackForm>["meta"] }>(
      "/feedback/forms",
      params,
    );
    return { data: res.data.map(toForm), meta: res.meta };
  },

  async getForm(id: number): Promise<FeedbackFormDetail> {
    const f = await apiClient.get<BackendFeedbackForm>(`/feedback/forms/${id}`);
    return toFormDetail(f);
  },

  async getResults(id: number): Promise<FeedbackResults> {
    return apiClient.get<FeedbackResults>(`/feedback/forms/${id}/results`);
  },

  async createForm(input: CreateFeedbackFormInput): Promise<FeedbackFormDetail> {
    const f = await apiClient.post<BackendFeedbackForm>("/feedback/forms", input);
    return toFormDetail(f);
  },

  async updateForm(id: number, input: UpdateFeedbackFormInput): Promise<FeedbackForm> {
    const f = await apiClient.patch<BackendFeedbackForm>(`/feedback/forms/${id}`, input);
    return toForm(f);
  },

  async deleteForm(id: number): Promise<{ id: number }> {
    return apiClient.delete<{ id: number }>(`/feedback/forms/${id}`);
  },

  async addQuestion(formId: number, input: FeedbackQuestionInput): Promise<FeedbackQuestion> {
    const q = await apiClient.post<BackendFeedbackQuestion>(`/feedback/forms/${formId}/questions`, input);
    return toQuestion(q);
  },

  async updateQuestion(formId: number, questionId: number, input: Partial<FeedbackQuestionInput>): Promise<FeedbackQuestion> {
    const q = await apiClient.patch<BackendFeedbackQuestion>(`/feedback/forms/${formId}/questions/${questionId}`, input);
    return toQuestion(q);
  },

  async deleteQuestion(formId: number, questionId: number): Promise<void> {
    await apiClient.delete(`/feedback/forms/${formId}/questions/${questionId}`);
  },

  async publishForm(id: number): Promise<{ id: number; is_published: boolean }> {
    return apiClient.patch(`/feedback/forms/${id}/publish`, {});
  },

  async listQuestionTemplates(category: FeedbackCourseType): Promise<FeedbackQuestionTemplate[]> {
    const rows = await apiClient.get<BackendQuestionTemplate[]>("/feedback/forms/question-templates", { category });
    return rows.map(toQuestionTemplate);
  },
};
