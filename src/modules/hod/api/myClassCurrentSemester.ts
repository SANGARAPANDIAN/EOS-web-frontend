import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface HodCurrentSemesterSubject {
  class_id: number;
  subject_id: number;
  subject_name: string;
  subject_code: string;
  section: string;
  semester: number | null;
  initials: string;
  hours_per_week: number;
  materials_count: number;
  tasks_count: number;
  percent_covered: number | null;
}

export interface HodCurrentSemesterOverview {
  academic_year: string;
  subjects: HodCurrentSemesterSubject[];
}

/** GET /hod/my-class/current-semester */
export function useHodCurrentSemester() {
  return useQuery({
    queryKey: ["hod", "my-class", "current-semester"],
    queryFn: () => apiClient.get<HodCurrentSemesterOverview>("/hod/my-class/current-semester"),
  });
}
