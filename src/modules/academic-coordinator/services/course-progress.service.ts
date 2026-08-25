import { apiClient } from "@/lib/api/client";
import type { CourseProgress } from "../types";

interface BackendSession {
  id: number;
  sequence_no: number;
  unit_title: string | null;
  topic: string;
  is_covered: boolean;
  session_date: string;
}

interface BackendCourseProgress {
  id: number;
  subject_code: string;
  subject_name: string;
  class_id: number;
  batch_id: number;
  department_id: number;
  class_label: string;
  faculty_name: string;
  semester: number;
  sessions: BackendSession[];
  total_sessions: number;
  covered_sessions: number;
  percent_complete: number | null;
}

export const courseProgressService = {
  async list(): Promise<CourseProgress[]> {
    const rows = await apiClient.get<BackendCourseProgress[]>("/me/coordinator/course-progress");
    return rows.map((r) => ({
      id: r.id,
      subjectCode: r.subject_code,
      subjectName: r.subject_name,
      classId: r.class_id,
      batchId: r.batch_id,
      departmentId: r.department_id,
      classLabel: r.class_label,
      facultyName: r.faculty_name,
      semester: r.semester,
      sessions: r.sessions.map((s) => ({
        id: s.id,
        sequenceNo: s.sequence_no,
        unitTitle: s.unit_title,
        topic: s.topic,
        isCovered: s.is_covered,
        sessionDate: s.session_date,
      })),
      totalSessions: r.total_sessions,
      coveredSessions: r.covered_sessions,
      percentComplete: r.percent_complete,
    }));
  },
};
