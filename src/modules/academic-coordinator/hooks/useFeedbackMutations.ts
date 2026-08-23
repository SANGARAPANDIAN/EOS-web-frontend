import { useMutation, useQueryClient } from "@tanstack/react-query";
import { feedbackService } from "../services/feedback.service";
import { coordinatorKeys } from "../query-keys";
import type { CreateFeedbackFormInput, FeedbackQuestionInput, UpdateFeedbackFormInput } from "../types";

export function useCreateFeedbackForm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateFeedbackFormInput) => feedbackService.createForm(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: coordinatorKeys.feedbackForms.all() }),
  });
}

export function useUpdateFeedbackForm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateFeedbackFormInput }) => feedbackService.updateForm(id, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: coordinatorKeys.feedbackForms.all() });
      queryClient.invalidateQueries({ queryKey: coordinatorKeys.feedbackForms.detail(variables.id) });
    },
  });
}

export function useDeleteFeedbackForm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => feedbackService.deleteForm(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: coordinatorKeys.feedbackForms.all() }),
  });
}

export function useAddFeedbackQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ formId, input }: { formId: number; input: FeedbackQuestionInput }) => feedbackService.addQuestion(formId, input),
    onSuccess: (_data, variables) =>
      queryClient.invalidateQueries({ queryKey: coordinatorKeys.feedbackForms.detail(variables.formId) }),
  });
}

export function useUpdateFeedbackQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ formId, questionId, input }: { formId: number; questionId: number; input: Partial<FeedbackQuestionInput> }) =>
      feedbackService.updateQuestion(formId, questionId, input),
    onSuccess: (_data, variables) =>
      queryClient.invalidateQueries({ queryKey: coordinatorKeys.feedbackForms.detail(variables.formId) }),
  });
}

export function usePublishFeedbackForm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => feedbackService.publishForm(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: coordinatorKeys.feedbackForms.all() });
      queryClient.invalidateQueries({ queryKey: coordinatorKeys.feedbackForms.detail(id) });
    },
  });
}

export function useDeleteFeedbackQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ formId, questionId }: { formId: number; questionId: number }) => feedbackService.deleteQuestion(formId, questionId),
    onSuccess: (_data, variables) =>
      queryClient.invalidateQueries({ queryKey: coordinatorKeys.feedbackForms.detail(variables.formId) }),
  });
}
