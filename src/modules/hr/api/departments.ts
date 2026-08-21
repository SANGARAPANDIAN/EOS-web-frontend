import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { hrKeys } from "./queryKeys";
import type { DepartmentAppraisalRollupStatus, HrDepartmentRollup } from "./dashboard";

export type { DepartmentAppraisalRollupStatus, HrDepartmentRollup };

/** GET /hr/departments — every department with live rollup counts (HR Payroll only). */
export function useHrDepartments() {
  return useQuery({
    queryKey: hrKeys.departments.all(),
    queryFn: () => apiClient.get<HrDepartmentRollup[]>("/hr/departments"),
  });
}

/** GET /hr/departments/:id */
export function useHrDepartment(id: number | null) {
  return useQuery({
    queryKey: hrKeys.departments.detail(id ?? -1),
    queryFn: () => apiClient.get<HrDepartmentRollup>(`/hr/departments/${id}`),
    enabled: id !== null && Number.isFinite(id),
  });
}
