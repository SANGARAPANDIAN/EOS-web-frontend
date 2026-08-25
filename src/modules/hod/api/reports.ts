import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface HodReportsSummary {
  department: { id: number; name: string; code: string };
  student_count: number;
  pass_percent: number | null;
  pass_percent_change: number | null;
  average_cgpa: number | null;
  average_cgpa_change: number | null;
  arrears_count: number;
  arrears_count_change: number | null;
  distinction_count: number;
  distinction_count_change: number;
  phd_count: number;
  faculty_count: number;
}

/** GET /hod/reports/summary */
export function useHodReportsSummary() {
  return useQuery({
    queryKey: ["hod", "reports", "summary"],
    queryFn: () => apiClient.get<HodReportsSummary>("/hod/reports/summary"),
  });
}

export interface HodClassPassRate {
  class_id: number;
  section: string;
  year: string;
  semester: number;
  current_pass_percent: number | null;
  previous_semester: number | null;
  previous_pass_percent: number | null;
  change_pts: number | null;
}

export interface HodClassPassRates {
  classes: HodClassPassRate[];
  best_movement: HodClassPassRate | null;
  declining_count: number;
  declining_classes: string[];
  lowest_but_improving: HodClassPassRate | null;
}

/** GET /hod/reports/classes?year=II */
export function useHodClassPassRates(year: string | null) {
  return useQuery({
    queryKey: ["hod", "reports", "classes", year],
    queryFn: () =>
      apiClient.get<HodClassPassRates>("/hod/reports/classes", year ? { year } : undefined),
  });
}

export interface HodSubjectResult {
  subject_id: number;
  name: string;
  code: string;
  faculty_label: string | null;
  sections: { section: string; pass_percent: number | null }[];
  average_pass_percent: number | null;
  change_pts: number | null;
  needs_remedial: boolean;
  lowest_section_label: string | null;
}

export interface HodSubjectResultGroup {
  semester: number;
  year: string;
  sections: string[];
  subjects: HodSubjectResult[];
}

/** GET /hod/reports/subjects */
export function useHodSubjectResults() {
  return useQuery({
    queryKey: ["hod", "reports", "subjects"],
    queryFn: () => apiClient.get<{ groups: HodSubjectResultGroup[] }>("/hod/reports/subjects"),
  });
}
