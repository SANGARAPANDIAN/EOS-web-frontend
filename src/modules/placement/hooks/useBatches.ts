import { useQuery } from "@tanstack/react-query";
import { batchesService } from "../services/batches.service";
import { placementKeys } from "../query-keys";

export function useBatches() {
  return useQuery({
    queryKey: placementKeys.batches(),
    queryFn: batchesService.list,
    staleTime: 5 * 60 * 1000,
  });
}
