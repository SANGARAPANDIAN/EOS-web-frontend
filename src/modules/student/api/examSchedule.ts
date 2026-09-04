import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface ExamScheduleRow {
  id: number;
  exam_type: string;
  academic_year: string;
  semester: number;
  subject_name: string;
  subject_code: string;
  exam_date: string;
  start_time: string;
  end_time: string;
  session: "FN" | "AN";
  venue_name: string | null;
  seat_number: string | null;
}

/** GET /me/exam-schedule — every published exam slot for the student's class. */
export function useMyExamSchedule() {
  return useQuery({
    queryKey: ["me", "exam-schedule"],
    queryFn: () => apiClient.get<ExamScheduleRow[]>("/me/exam-schedule"),
  });
}
