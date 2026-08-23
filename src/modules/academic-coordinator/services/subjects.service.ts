import { apiClient } from "@/lib/api/client";
import type { CreateSubjectInput, Subject, UpdateSubjectInput } from "../types";

interface BackendSubject {
  id: number;
  name: string;
  subject_code: string;
  department_id: number | null;
  credits: number | null;
  short_code: string | null;
  course_type: Subject["courseType"];
  category: Subject["category"];
  hours: number | null;
  semester: number | null;
  created_at: string;
}

function toSubject(s: BackendSubject): Subject {
  return {
    id: s.id,
    name: s.name,
    subjectCode: s.subject_code,
    departmentId: s.department_id,
    credits: s.credits,
    shortCode: s.short_code,
    courseType: s.course_type,
    category: s.category,
    hours: s.hours,
    semester: s.semester,
    createdAt: s.created_at,
  };
}

export const subjectsService = {
  async list(): Promise<Subject[]> {
    const rows = await apiClient.get<BackendSubject[]>("/subjects");
    return rows.map(toSubject);
  },

  async create(input: CreateSubjectInput): Promise<Subject> {
    const s = await apiClient.post<BackendSubject>("/subjects", input);
    return toSubject(s);
  },

  async update(id: number, input: UpdateSubjectInput): Promise<Subject> {
    const s = await apiClient.patch<BackendSubject>(`/subjects/${id}`, input);
    return toSubject(s);
  },

  async remove(id: number): Promise<void> {
    await apiClient.delete(`/subjects/${id}`);
  },
};
