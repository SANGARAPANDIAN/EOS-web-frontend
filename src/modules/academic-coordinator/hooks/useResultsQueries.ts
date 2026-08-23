import { useQuery } from "@tanstack/react-query";
import { resultsService } from "../services/results.service";
import { coordinatorKeys } from "../query-keys";

export function useClassResults(classId: number | null) {
  return useQuery({
    queryKey: coordinatorKeys.results.class(classId ?? 0),
    queryFn: () => resultsService.classResults(classId as number),
    enabled: classId != null,
  });
}
