import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { ExamScheduleRow } from "@/modules/student/api/examSchedule";

export type { ExamScheduleRow } from "@/modules/student/api/examSchedule";

/** GET /me/children/:id/exam-schedule */
export function useChildExamSchedule(childId: number | null) {
  return useQuery({
    queryKey: ["me", "children", childId, "exam-schedule"],
    queryFn: () => apiClient.get<ExamScheduleRow[]>(`/me/children/${childId}/exam-schedule`),
    enabled: childId !== null,
  });
}
