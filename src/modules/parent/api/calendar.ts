import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { MyAcademicCalendar } from "@/modules/student/api/profile";

export type { MyAcademicCalendar, AcademicCalendarEvent } from "@/modules/student/api/profile";

/** GET /me/children/:id/academic-calendar — current semester number + semester date range + events. */
export function useChildAcademicCalendar(childId: number | null) {
  return useQuery({
    queryKey: ["me", "children", childId, "academic-calendar"],
    queryFn: () => apiClient.get<MyAcademicCalendar>(`/me/children/${childId}/academic-calendar`),
    enabled: childId !== null,
  });
}
