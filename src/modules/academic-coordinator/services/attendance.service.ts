import { apiClient } from "@/lib/api/client";
import type { ClassAttendance } from "../types";

interface BackendSubject {
  id: number;
  name: string;
  subject_code: string;
}

interface BackendAttendanceRow {
  student: { id: number; roll_no: string | null; student_id_no: string; name: string };
  subject_percentages: Record<string, number | null>;
  overall_percentage: number | null;
  status: "Shortage" | "Adequate";
}

interface BackendClassAttendance {
  class_id: number;
  subjects: BackendSubject[];
  rows: BackendAttendanceRow[];
}

export const attendanceService = {
  async classAttendance(classId: number): Promise<ClassAttendance> {
    const res = await apiClient.get<BackendClassAttendance>(`/me/coordinator/attendance/classes/${classId}`);
    return {
      classId: res.class_id,
      subjects: res.subjects.map((s) => ({ id: s.id, name: s.name, subjectCode: s.subject_code })),
      rows: res.rows.map((r) => ({
        student: { id: r.student.id, rollNo: r.student.roll_no, studentIdNo: r.student.student_id_no, name: r.student.name },
        subjectPercentages: Object.fromEntries(Object.entries(r.subject_percentages).map(([k, v]) => [Number(k), v])),
        overallPercentage: r.overall_percentage,
        status: r.status,
      })),
    };
  },
};
