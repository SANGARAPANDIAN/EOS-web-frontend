import { useMutation, useQueryClient } from "@tanstack/react-query";
import { interviewsService } from "../services/interviews.service";
import { placementKeys } from "../query-keys";
import type { CreateInterviewInput, RecordInterviewResultInput, RescheduleInterviewInput } from "../types";

function useInvalidateInterviews() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: placementKeys.interviews.all() });
    queryClient.invalidateQueries({ queryKey: placementKeys.drives.all() });
    queryClient.invalidateQueries({ queryKey: [...placementKeys.all, "student-report"] });
    queryClient.invalidateQueries({ queryKey: placementKeys.dashboard() });
  };
}

export function useCreateInterview() {
  const invalidate = useInvalidateInterviews();
  return useMutation({
    mutationFn: (input: CreateInterviewInput) => interviewsService.create(input),
    onSuccess: invalidate,
  });
}

export function useRescheduleInterview() {
  const invalidate = useInvalidateInterviews();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: RescheduleInterviewInput }) =>
      interviewsService.reschedule(id, input),
    onSuccess: invalidate,
  });
}

export function useRecordInterviewResult() {
  const invalidate = useInvalidateInterviews();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: RecordInterviewResultInput }) =>
      interviewsService.recordResult(id, input),
    onSuccess: invalidate,
  });
}
