import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface HodAcademicCalendar {
  semester: number | null;
  start_date: string | null;
  end_date: string | null;
  events: { id: number; event_date: string; event_type: string; title: string; description: string | null }[];
}

/** GET /me/faculty-academic-calendar — Faculty/HoD. Merged across every class the HoD's own teaching load touches this academic year. */
export function useHodAcademicCalendar() {
  return useQuery({
    queryKey: ["hod", "faculty-academic-calendar"],
    queryFn: () => apiClient.get<HodAcademicCalendar>("/me/faculty-academic-calendar"),
  });
}
