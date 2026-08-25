import { useMutation, useQueryClient } from "@tanstack/react-query";
import { mappingService } from "../services/mapping.service";
import { coordinatorKeys } from "../query-keys";

export function useAddMapping(departmentId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ semester, subjectId }: { semester: number; subjectId: number }) =>
      mappingService.add(departmentId as number, semester, subjectId),
    onSuccess: () => {
      if (departmentId != null) queryClient.invalidateQueries({ queryKey: coordinatorKeys.mapping.department(departmentId) });
    },
  });
}

export function useRemoveMapping(departmentId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ semester, subjectId }: { semester: number; subjectId: number }) =>
      mappingService.remove(departmentId as number, semester, subjectId),
    onSuccess: () => {
      if (departmentId != null) queryClient.invalidateQueries({ queryKey: coordinatorKeys.mapping.department(departmentId) });
    },
  });
}
