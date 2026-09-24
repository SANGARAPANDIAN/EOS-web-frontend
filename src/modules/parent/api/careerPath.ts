import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { CareerPath } from "@/modules/student/api/profile";

/** GET /me/children/:id/career-path — gates the same career-path-tagged nav items (Placements/My Venture/Higher Studies) the student sidebar gates, by the child's own declared path. */
export function useChildCareerPath(childId: number | null) {
  return useQuery({
    queryKey: ["me", "children", childId, "career-path"],
    queryFn: () => apiClient.get<{ career_path: CareerPath | null }>(`/me/children/${childId}/career-path`),
    enabled: childId !== null,
  });
}
