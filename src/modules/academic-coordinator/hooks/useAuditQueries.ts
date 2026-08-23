import { useQuery } from "@tanstack/react-query";
import { auditService } from "../services/audit.service";
import { coordinatorKeys } from "../query-keys";

export function useDepartmentAudit(departmentId: number | null, semester: number | null, batchId: number | null) {
  return useQuery({
    queryKey: coordinatorKeys.audit.departmentSemester(departmentId ?? 0, semester ?? 0, batchId ?? 0),
    queryFn: () => auditService.get(departmentId as number, semester as number, batchId as number),
    enabled: departmentId != null && semester != null && batchId != null,
  });
}
