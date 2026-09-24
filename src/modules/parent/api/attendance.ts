import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { AttendanceSummary } from "@/modules/student/api/attendance";

export type { AttendanceSummary };

/** GET /me/children/:id/attendance — requires a from/to range (ISO date strings). */
export function useChildAttendance(childId: number | null, from?: string, to?: string) {
  return useQuery({
    queryKey: ["me", "children", childId, "attendance", from, to],
    queryFn: () => apiClient.get<AttendanceSummary>(`/me/children/${childId}/attendance`, { from, to }),
    enabled: childId !== null && Boolean(from && to),
  });
}
