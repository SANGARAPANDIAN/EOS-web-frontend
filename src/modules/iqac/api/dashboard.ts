import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface AttentionFlag {
  type: string;
  title: string;
  description: string;
}

export interface IqacDashboardOverview {
  students_total: number;
  faculty_total: number;
  departments_total: number;
  programmes_total: number;
  student_faculty_ratio: number | null;
  placement_percentage: number | null;
  placed_count: number;
  higher_studies_count: number;
  higher_studies_percentage: number | null;
  publications_total: number;
  patents_total: number | null;
  funded_projects_count: number;
  funded_projects_amount: number;
  mous_total: number;
  student_satisfaction: number | null;
  faculty_satisfaction: number | null;
  attention_flags: AttentionFlag[];
}

/** GET /me/iqac/dashboard — real institution-wide rollup, reusing Principal/Placements/Higher-education services. */
export function useIqacDashboard() {
  return useQuery({
    queryKey: ["iqac", "dashboard"],
    queryFn: () => apiClient.get<IqacDashboardOverview>("/me/iqac/dashboard"),
  });
}
