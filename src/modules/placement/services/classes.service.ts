import { apiClient } from "@/lib/api/client";
import type { ClassSummary } from "../types";

interface BackendClass {
  id: number;
  batch_id: number;
  department_id: number;
  course_id: number;
  section: string;
  current_semester: number | null;
}

export const classesService = {
  async list(): Promise<ClassSummary[]> {
    const rows = await apiClient.get<BackendClass[]>("/classes");
    return rows.map((c) => ({
      id: c.id,
      batchId: c.batch_id,
      departmentId: c.department_id,
      courseId: c.course_id,
      section: c.section,
      currentSemester: c.current_semester,
    }));
  },
};
