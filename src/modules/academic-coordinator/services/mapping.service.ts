import { apiClient } from "@/lib/api/client";
import type { DepartmentMapping, MappedSubject, MappingSubject } from "../types";

interface BackendSubject {
  id: number;
  subject_code: string;
  short_code: string | null;
  name: string;
  course_type: MappingSubject["courseType"];
  category: MappingSubject["category"];
  credits: number | null;
  department_id: number | null;
}

interface BackendMappedSubject extends BackendSubject {
  mapped_classes: number;
}

interface BackendSemesterBucket {
  semester: number;
  total_classes: number;
  mapped: BackendMappedSubject[];
}

interface BackendMapping {
  department_id: number;
  semesters: BackendSemesterBucket[];
  pool: BackendSubject[];
}

function toSubject(s: BackendSubject): MappingSubject {
  return {
    id: s.id,
    subjectCode: s.subject_code,
    shortCode: s.short_code,
    name: s.name,
    courseType: s.course_type,
    category: s.category,
    credits: s.credits,
    departmentId: s.department_id,
  };
}

function toMappedSubject(s: BackendMappedSubject): MappedSubject {
  return { ...toSubject(s), mappedClasses: s.mapped_classes };
}

export const mappingService = {
  async get(departmentId: number): Promise<DepartmentMapping> {
    const res = await apiClient.get<BackendMapping>("/me/coordinator/mapping", { department_id: departmentId });
    return {
      departmentId: res.department_id,
      semesters: res.semesters.map((b) => ({
        semester: b.semester,
        totalClasses: b.total_classes,
        mapped: b.mapped.map(toMappedSubject),
      })),
      pool: res.pool.map(toSubject),
    };
  },

  async add(departmentId: number, semester: number, subjectId: number): Promise<{ added: number; alreadyMapped: number; totalClasses: number }> {
    const res = await apiClient.post<{ added: number; already_mapped: number; total_classes: number }>("/me/coordinator/mapping/add", {
      department_id: departmentId,
      semester,
      subject_id: subjectId,
    });
    return { added: res.added, alreadyMapped: res.already_mapped, totalClasses: res.total_classes };
  },

  async remove(departmentId: number, semester: number, subjectId: number): Promise<{ removed: number }> {
    return apiClient.post("/me/coordinator/mapping/remove", { department_id: departmentId, semester, subject_id: subjectId });
  },
};
