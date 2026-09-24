import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { LeaveListResponse } from "@/modules/student/api/leave";

export type { LeaveRow, LeaveStatus } from "@/modules/student/api/leave";

/** GET /me/children/:id/leaves — read-only, no create (a parent never files leave on a child's behalf). */
export function useChildLeaves(childId: number | null) {
  return useQuery({
    queryKey: ["me", "children", childId, "leaves"],
    queryFn: () => apiClient.get<LeaveListResponse>(`/me/children/${childId}/leaves`),
    enabled: childId !== null,
  });
}
