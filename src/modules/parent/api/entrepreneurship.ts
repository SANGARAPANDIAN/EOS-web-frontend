import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { EdcEntrepreneurshipRow } from "@/modules/edc/api/entrepreneurship";

/** GET /me/children/:id/entrepreneurship — "My Venture", staff-entered, read-only for the student too. */
export function useChildEntrepreneurship(childId: number | null) {
  return useQuery({
    queryKey: ["me", "children", childId, "entrepreneurship"],
    queryFn: () => apiClient.get<EdcEntrepreneurshipRow | null>(`/me/children/${childId}/entrepreneurship`),
    enabled: childId !== null,
  });
}
