import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface HodEdcRow {
  id: number;
  student_id: number;
  student_id_no: string;
  name: string;
  photo_url: string | null;
  department_code: string | null;
  batch_label: string | null;
  venture: string;
  domain: string | null;
  role: string | null;
  monthly_revenue: number | null;
  stage: string | null;
}

export interface HodEdcOverview {
  stats: {
    total: number;
    startups_beyond_idea: number;
    registered_ventures: number;
    private_limited_count: number;
    startups_inside_college: number;
  };
  filters: {
    batches: { batch_id: number; label: string }[];
    departments: { department_id: number; name: string; code: string }[];
  };
  rows: HodEdcRow[];
}

/** GET /hod/edc?search=&batch_id=&department_id= */
export function useHodEdc(search: string, batchId: number | null, departmentId: number | null) {
  return useQuery({
    queryKey: ["hod", "edc", search, batchId, departmentId],
    queryFn: () =>
      apiClient.get<HodEdcOverview>("/hod/edc", {
        search: search || undefined,
        batch_id: batchId ?? undefined,
        department_id: departmentId ?? undefined,
      }),
  });
}

export interface HodEdcProfile {
  id: number;
  student: {
    id: number;
    name: string;
    photo_url: string | null;
    student_id_no: string;
    department_code: string | null;
    programme: string | null;
    batch_label: string | null;
    year_label: string | null;
    section: string | null;
    mobile: string | null;
    email: string;
  };
  venture: {
    business_name: string;
    sector: string | null;
    stage: string | null;
    entrepreneur_type: string | null;
    funding_status: string | null;
    year_started: number | null;
    is_incubated: boolean;
    logo_url: string | null;
  };
  stats: {
    customers_count: number | null;
    monthly_revenue: number | null;
    team_size: number | null;
    funding_raised: number | null;
  };
  entrepreneurship_status: {
    stage: string | null;
    entrepreneur_type: string | null;
    year_started: number | null;
    current_status_note: string | null;
    registration_type: string | null;
  };
  business_details: {
    business_name: string;
    sector: string | null;
    business_category: string | null;
    problem_statement: string | null;
    location: string | null;
    solution_product: string | null;
    business_model: string | null;
    target_customers: string | null;
    website: string | null;
    linkedin_url: string | null;
  };
  founder_team: {
    founder_name: string;
    co_founders: string | null;
    team_size: number | null;
    student_team_note: string | null;
    faculty_mentor: string | null;
    external_mentor_name: string | null;
    external_mentor_org: string | null;
    team_roles_note: string | null;
  };
  startup_progress: {
    idea_developed: boolean | null;
    prototype_developed: boolean | null;
    mvp_launched: boolean | null;
    product_launched: boolean | null;
    customers_count: number | null;
    monthly_revenue: number | null;
    team_size: number | null;
    growth_stage: string | null;
  };
  funding: {
    funding_status: string | null;
    funding_required: number | null;
    funding_received: number | null;
    funding_source: string | null;
    govt_grant_scheme: string | null;
    incubator_support: string | null;
    accelerator_support: string | null;
  };
  remarks: string | null;
}

/** GET /hod/edc/:id */
export function useHodEdcProfile(id: number) {
  return useQuery({
    queryKey: ["hod", "edc", "profile", id],
    queryFn: () => apiClient.get<HodEdcProfile>(`/hod/edc/${id}`),
    enabled: Number.isFinite(id),
  });
}
