import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { ExamMarkRecord } from "./types";

/**
 * GET /exam-marks?student_id= — every exam mark for one student, across
 * every subject/exam-type/semester. Single shared data source for
 * SubjectMarksTable, reused identically by Admin/Faculty/HoD/Principal/COE
 * (moved here from admin/api/students.ts, which now re-exports it for its
 * other existing call sites).
 */
export function useStudentExamMarks(studentId: number, enabled: boolean) {
  return useQuery({
    queryKey: ["shared", "exam-marks", studentId],
    queryFn: () => apiClient.get<ExamMarkRecord[]>("/exam-marks", { student_id: studentId }),
    enabled,
  });
}
