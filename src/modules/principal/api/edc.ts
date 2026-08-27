import { useQuery } from "@tanstack/react-query";
import { apiClient, type QueryParams } from "@/lib/api/client";

export interface EdcFilters {
  batches: { id: number; name: string }[];
  departments: { id: number; name: string; code: string }[];
}

/** GET /me/principal/edc/filters */
export function useEdcFilters() {
  return useQuery({
    queryKey: ["me", "principal", "edc", "filters"],
    queryFn: () => apiClient.get<EdcFilters>("/me/principal/edc/filters"),
  });
}

export interface EdcSummary {
  students_in_edc: number;
  startups_beyond_idea: number;
  registered_ventures_count: number | null;
  incubated_count: number | null;
}

/** GET /me/principal/edc/summary — registered_ventures_count/incubated_count are null until query.md #5 is run. */
export function useEdcSummary() {
  return useQuery({
    queryKey: ["me", "principal", "edc", "summary"],
    queryFn: () => apiClient.get<EdcSummary>("/me/principal/edc/summary"),
  });
}

export interface EdcRecord {
  id: number;
  student: { id: number; name: string; register_no: string | null };
  batch: { id: number; name: string } | null;
  department: { id: number; name: string; code: string } | null;
  venture: string;
  description: string | null;
  domain: string | null;
  stage: string | null;
  registration_type: string | null;
  is_incubated: boolean | null;
  role: string | null;
  funding_required: number | null;
  remarks: string | null;
}

export interface EdcListParams {
  q?: string;
  batch_id?: number;
  department_id?: number;
}

/** GET /me/principal/edc */
export function useEdcList(params: EdcListParams) {
  return useQuery({
    queryKey: ["me", "principal", "edc", "list", params],
    queryFn: () => apiClient.get<{ total: number; records: EdcRecord[] }>("/me/principal/edc", params as QueryParams),
  });
}

// --- Full EDC Student Profile detail screen ---
// Backed by GET /me/principal/edc/:id/profile — every field maps to a real
// column on student_entrepreneurship, the originating startup_ideas row
// (for "Solution / product"), or the same real family/contact data the
// Student Profile screen already uses. A total-headcount "employees"
// figure from the reference design has no backing anywhere in the schema
// (only team_size, the founding-team count, is real) so it's not shown.

export interface EdcProfile {
  id: number;
  student: {
    id: number;
    name: string;
    register_no: string | null;
    roll_no: string | null;
    photo_url: string | null;
    institute_email: string;
    mobile: string | null;
  };
  batch: { id: number; name: string } | null;
  department: { id: number; name: string; code: string } | null;
  programme: string | null;
  section: string | null;
  year: number | null;
  venture_name: string;
  venture_logo_url: string | null;
  description: string | null;
  sector: string | null;
  business_category: string | null;
  problem_statement: string | null;
  solution: string | null;
  location: string | null;
  business_model: string | null;
  target_customers: string | null;
  website: string | null;
  linkedin_url: string | null;
  co_founders: string | null;
  team_size: number | null;
  student_team_note: string | null;
  faculty_mentor: string | null;
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
  funding_required: number | null;
  funding_received: number | null;
  funding_source: string | null;
  govt_grant_scheme: string | null;
  incubator_support: string | null;
  accelerator_support: string | null;
  stage: string | null;
  registration_type: string | null;
  registration_label: string | null;
  is_registered: boolean;
  is_incubated: boolean | null;
  incubation_status: string | null;
  role: string | null;
  year_started: number | null;
  current_status_note: string | null;
  remarks: string | null;
  family: {
    father: { name: string | null; occupation: string | null; mobile: string | null; email: string | null; photo_url: string | null };
    mother: { name: string | null; occupation: string | null; mobile: string | null; email: string | null; photo_url: string | null };
    guardian: { name: string | null; relationship: string | null; is_father: boolean; mobile: string | null; email: string | null };
  } | null;
}

export function useEdcProfile(id: number | undefined) {
  return useQuery({
    queryKey: ["me", "principal", "edc", "profile", id],
    queryFn: () => apiClient.get<EdcProfile>(`/me/principal/edc/${id}/profile`),
    enabled: id !== undefined,
  });
}
