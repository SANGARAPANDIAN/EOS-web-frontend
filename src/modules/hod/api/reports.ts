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

/** GET /hod/reports/summary?from=&to= — bounds the "current" figures to a real exams.start_date window; the "previous semester" comparison is never narrowed by it (that baseline is a different calendar period by definition). Omitting both keeps the original unfiltered behaviour. */
export function useHodReportsSummary(from?: string, to?: string) {
  return useQuery({
    queryKey: ["hod", "reports", "summary", from, to],
    queryFn: () =>
      apiClient.get<HodReportsSummary>("/hod/reports/summary", {
        from: from || undefined,
        to: to || undefined,
      }),
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
}

/** GET /hod/reports/classes?year=II&from=&to= */
export function useHodClassPassRates(year: string | null, from?: string, to?: string) {
  return useQuery({
    queryKey: ["hod", "reports", "classes", year, from, to],
    queryFn: () =>
      apiClient.get<HodClassPassRates>("/hod/reports/classes", {
        year: year || undefined,
        from: from || undefined,
        to: to || undefined,
      }),
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

/** GET /hod/reports/subjects?from=&to= */
export function useHodSubjectResults(from?: string, to?: string) {
  return useQuery({
    queryKey: ["hod", "reports", "subjects", from, to],
    queryFn: () =>
      apiClient.get<{ groups: HodSubjectResultGroup[] }>("/hod/reports/subjects", {
        from: from || undefined,
        to: to || undefined,
      }),
  });
}
