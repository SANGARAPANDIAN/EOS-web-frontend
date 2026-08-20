import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// GET /me/mentee-entrepreneurship (MeMenteeEntrepreneurshipController) —
// Same real-time class_mentors scoping as mentee-higher-education. Field set
// matches the full student_entrepreneurship row
// (StudentEntrepreneurshipService.findAllForMentor).

export interface MenteeEntrepreneurshipRow {
  id: number;
  business_name: string;
  business_description: string | null;
  sector: string | null;
  stage: string | null;
  funding_required: number | null;
  remarks: string | null;
  created_at: string;
  is_incubated: boolean | null;
  registration_type: string | null;
  website: string | null;
  venture_logo_url: string | null;
  current_status_note: string | null;
  role: string | null;
  year_started: number | null;
  business_category: string | null;
  problem_statement: string | null;
  location: string | null;
  business_model: string | null;
  target_customers: string | null;
  linkedin_url: string | null;
  co_founders: string | null;
  team_size: number | null;
  student_team_note: string | null;
  mentor_faculty_id: number | null;
  mentor_faculty_name: string | null;
  external_mentor_name: string | null;
  external_mentor_org: string | null;
  team_roles_note: string | null;
  idea_developed: boolean | null;
  prototype_developed: boolean | null;
  mvp_launched: boolean | null;
  product_launched: boolean | null;
  customers_count: number | null;
  monthly_revenue: number | null;
  growth_stage: string | null;
  funding_status: string | null;
  funding_received: number | null;
  funding_source: string | null;
  govt_grant_scheme: string | null;
  incubator_support: string | null;
  accelerator_support: string | null;
  student: { id: number; student_id_no: string; name: string; section: string | null };
}

export function useMenteeEntrepreneurship() {
  return useQuery({
    queryKey: ["me", "mentee-entrepreneurship"],
    queryFn: () => apiClient.get<MenteeEntrepreneurshipRow[]>("/me/mentee-entrepreneurship"),
  });
}
