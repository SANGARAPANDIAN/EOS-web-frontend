import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { MyHigherEducation } from "@/modules/student/api/higherEducation";

export type { MyHigherEducation } from "@/modules/student/api/higherEducation";

/** GET /me/children/:id/higher-education — staff-entered, read-only for the student too. */
export function useChildHigherEducation(childId: number | null) {
  return useQuery({
    queryKey: ["me", "children", childId, "higher-education"],
    queryFn: () => apiClient.get<MyHigherEducation | null>(`/me/children/${childId}/higher-education`),
    enabled: childId !== null,
  });
}
