import { useQuery } from "@tanstack/react-query";
import { departmentsService } from "../services/departments.service";
import { placementKeys } from "../query-keys";

export function useDepartments() {
  return useQuery({
    queryKey: placementKeys.departments(),
    queryFn: departmentsService.list,
    staleTime: 5 * 60 * 1000,
  });
}
