import { useQuery } from "@tanstack/react-query";
import { interviewsService } from "../services/interviews.service";
import { placementKeys } from "../query-keys";

export function useInterviews() {
  return useQuery({
    queryKey: placementKeys.interviews.list(),
    queryFn: () => interviewsService.list(),
  });
}
