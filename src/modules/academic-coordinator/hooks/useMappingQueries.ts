import { useQuery } from "@tanstack/react-query";
import { mappingService } from "../services/mapping.service";
import { coordinatorKeys } from "../query-keys";

export function useDepartmentMapping(departmentId: number | null) {
  return useQuery({
    queryKey: coordinatorKeys.mapping.department(departmentId ?? 0),
    queryFn: () => mappingService.get(departmentId as number),
    enabled: departmentId != null,
  });
}
