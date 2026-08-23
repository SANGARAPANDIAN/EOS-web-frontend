import { useMutation, useQueryClient } from "@tanstack/react-query";
import { subjectsService } from "../services/subjects.service";
import { coordinatorKeys } from "../query-keys";
import type { CreateSubjectInput, UpdateSubjectInput } from "../types";

export function useCreateSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSubjectInput) => subjectsService.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: coordinatorKeys.subjects() }),
  });
}

export function useUpdateSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateSubjectInput }) => subjectsService.update(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: coordinatorKeys.subjects() }),
  });
}

export function useDeleteSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => subjectsService.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: coordinatorKeys.subjects() }),
  });
}
