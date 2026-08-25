import { apiClient } from "@/lib/api/client";
import type { ClassResults } from "../types";

interface BackendSubject {
  subject_id: number;
  subject_code: string;
  subject_name: string;
  pass_percentage: number | null;
}

interface BackendRow {
  student: { id: number; roll_no: string | null; name: string };
  cgpa: number | null;
  backlogs: number;
  standing: ClassResults["rows"][number]["standing"];
}

interface BackendClassResults {
  class_id: number;
  pass_percentage: number | null;
  class_average: number | null;
  highest_mark: number | null;
  lowest_mark: number | null;
  students_with_backlogs: number;
  subjects: BackendSubject[];
  rows: BackendRow[];
}

export const resultsService = {
  async classResults(classId: number): Promise<ClassResults> {
    const res = await apiClient.get<BackendClassResults>(`/me/coordinator/results/classes/${classId}`);
    return {
      classId: res.class_id,
      passPercentage: res.pass_percentage,
      classAverage: res.class_average,
      highestMark: res.highest_mark,
      lowestMark: res.lowest_mark,
      studentsWithBacklogs: res.students_with_backlogs,
      subjects: res.subjects.map((s) => ({ subjectId: s.subject_id, subjectCode: s.subject_code, subjectName: s.subject_name, passPercentage: s.pass_percentage })),
      rows: res.rows.map((r) => ({ student: { id: r.student.id, rollNo: r.student.roll_no, name: r.student.name }, cgpa: r.cgpa, backlogs: r.backlogs, standing: r.standing })),
    };
  },
};
