import { apiClient } from "@/lib/api/client";
import type { Department } from "../types";

interface BackendDepartment {
  id: number;
  name: string;
  code: string;
}

export const departmentsService = {
  async list(): Promise<Department[]> {
    const rows = await apiClient.get<BackendDepartment[]>("/departments");
    return rows.map((d) => ({ id: d.id, name: d.name, code: d.code }));
  },
};
