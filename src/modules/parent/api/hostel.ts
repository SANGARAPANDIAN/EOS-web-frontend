import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { MyHostelRoom, HostelOuting } from "@/modules/student/api/hostel";

export type { MyHostelRoom, HostelOuting, OutingStatus } from "@/modules/student/api/hostel";

/** GET /me/children/:id/hostel-room */
export function useChildHostelRoom(childId: number | null) {
  return useQuery({
    queryKey: ["me", "children", childId, "hostel-room"],
    queryFn: () => apiClient.get<MyHostelRoom>(`/me/children/${childId}/hostel-room`),
    enabled: childId !== null,
  });
}

/** GET /me/children/:id/hostel-outings — read-only, no create. */
export function useChildHostelOutings(childId: number | null) {
  return useQuery({
    queryKey: ["me", "children", childId, "hostel-outings"],
    queryFn: () =>
      apiClient.get<{ data: HostelOuting[]; page: number; page_size: number; total: number }>(
        `/me/children/${childId}/hostel-outings`,
      ),
    enabled: childId !== null,
  });
}
