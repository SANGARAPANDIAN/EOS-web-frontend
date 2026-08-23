import { apiClient } from "@/lib/api/client";
import type { DepartmentAudit } from "../types";

interface BackendAudit {
  department_id: number;
  semester: number;
  batch_id: number;
  percent_complete: number;
  milestones: { label: string; status: DepartmentAudit["milestones"][number]["status"] }[];
}

export const auditService = {
  async get(departmentId: number, semester: number, batchId: number): Promise<DepartmentAudit> {
    const res = await apiClient.get<BackendAudit>("/me/coordinator/audit", { department_id: departmentId, semester, batch_id: batchId });
    return { departmentId: res.department_id, semester: res.semester, batchId: res.batch_id, percentComplete: res.percent_complete, milestones: res.milestones };
  },
};
