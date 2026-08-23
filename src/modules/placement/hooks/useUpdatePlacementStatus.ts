import { useMutation, useQueryClient } from "@tanstack/react-query";
import { studentReportService } from "../services/student-report.service";
import { placementKeys } from "../query-keys";
import type { UpdatePlacementStatusInput } from "../types";

export function useUpdatePlacementStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ studentId, input }: { studentId: number; input: UpdatePlacementStatusInput }) =>
      studentReportService.updatePlacementStatus(studentId, input),
    onSuccess: () => {
      // Partial key (no batchId suffix) so every batch-filtered variant of
      // the student report invalidates, not just the "all batches" one.
      queryClient.invalidateQueries({ queryKey: [...placementKeys.all, "student-report"] });
    },
  });
}
