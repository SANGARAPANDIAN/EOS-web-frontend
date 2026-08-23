import { useQuery } from "@tanstack/react-query";
import { classesService } from "../services/classes.service";
import { placementKeys } from "../query-keys";

export function useClasses() {
  return useQuery({
    queryKey: placementKeys.classes(),
    queryFn: classesService.list,
    staleTime: 5 * 60 * 1000,
  });
}
