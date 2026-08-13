import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface HodHigherEducationRow {
  id: number;
  student_id: number;
  student_id_no: string;
  name: string;
  photo_url: string | null;
  department_code: string;
  batch_label: string | null;
  programme: string;
  university: string | null;
  country: string;
  remarks: string | null;
  scholarship: string | null;
  status: string | null;
}

export interface HodHigherEducationOverview {
  department: { id: number; name: string; code: string };
  stats: {
    total: number;
    overseas_count: number;
    domestic_count: number;
    countries: string[];
  };
  filters: {
    batches: { batch_id: number; label: string }[];
    programmes: string[];
  };
  rows: HodHigherEducationRow[];
}

/** GET /hod/higher-education?search=&batch_id=&programme= */
export function useHodHigherEducation(search: string, batchId: number | null, programme: string | null) {
  return useQuery({
    queryKey: ["hod", "higher-education", search, batchId, programme],
    queryFn: () =>
      apiClient.get<HodHigherEducationOverview>("/hod/higher-education", {
        search: search || undefined,
        batch_id: batchId ?? undefined,
        programme: programme || undefined,
      }),
  });
}

export interface HodHigherEducationProfile {
  id: number;
  student: {
    id: number;
    name: string;
    photo_url: string | null;
    student_id_no: string;
    department_code: string | null;
    batch_label: string | null;
    mobile: string | null;
    email: string;
    guardian: { name: string; mobile: string | null } | null;
  };
  admission: {
    status: string | null;
    is_abroad: boolean;
    intake: string | null;
  };
  academic: {
    cgpa: number | null;
    percentage: number | null;
    backlogs: number;
    credits_earned: number;
  };
  programme: {
    course: string;
    university: string | null;
    country: string;
    intake: string | null;
    statement_of_purpose: string | null;
    recommendation: string | null;
  };
  readiness: {
    research_output: string | null;
    internship: string | null;
    passport: string | null;
    visa: string | null;
  };
  timeline: {
    application_submitted: string | null;
    test_score_reported: string | null;
    interview_date: string | null;
    offer_result: string | null;
  };
  funding: {
    scholarship: string | null;
    scholarship_value: number | null;
    loan_funding: string | null;
  };
  test_scores: string | null;
  remarks: string | null;
}

/** GET /hod/higher-education/:id */
export function useHodHigherEducationProfile(id: number) {
  return useQuery({
    queryKey: ["hod", "higher-education", "profile", id],
    queryFn: () => apiClient.get<HodHigherEducationProfile>(`/hod/higher-education/${id}`),
    enabled: Number.isFinite(id),
  });
}
