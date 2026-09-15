import { useQuery } from "@tanstack/react-query";
import { apiClient, type QueryParams } from "@/lib/api/client";

export interface HigherEducationFilters {
  batches: { id: number; name: string }[];
  departments: { id: number; name: string; code: string }[];
}

/** GET /me/principal/higher-education/filters */
export function useHigherEducationFilters() {
  return useQuery({
    queryKey: ["me", "principal", "higher-education", "filters"],
    queryFn: () => apiClient.get<HigherEducationFilters>("/me/principal/higher-education/filters"),
  });
}

export interface HigherEducationSummary {
  total: number;
  within_india: number;
  overseas: number;
  countries_count: number;
  countries: string[];
  scholarship_count: number | null;
  confirmed_admission_count: number | null;
}

/** GET /me/principal/higher-education/summary — scholarship_count/confirmed_admission_count are null until query.md #4 is run. */
export function useHigherEducationSummary() {
  return useQuery({
    queryKey: ["me", "principal", "higher-education", "summary"],
    queryFn: () => apiClient.get<HigherEducationSummary>("/me/principal/higher-education/summary"),
  });
}

export interface HigherEducationRecord {
  id: number;
  student: { id: number; name: string; register_no: string | null };
  batch: { id: number; name: string } | null;
  department: { id: number; name: string; code: string } | null;
  programme: string;
  university: string | null;
  country: string;
  is_abroad: boolean;
  remarks: string | null;
  is_scholarship: boolean | null;
  scholarship_name: string | null;
  admission_status: string | null;
}

export interface HigherEducationListParams {
  q?: string;
  batch_id?: number;
  department_id?: number;
}

/** GET /me/principal/higher-education */
export function useHigherEducationList(params: HigherEducationListParams) {
  return useQuery({
    queryKey: ["me", "principal", "higher-education", "list", params],
    queryFn: () =>
      apiClient.get<{ total: number; records: HigherEducationRecord[] }>(
        "/me/principal/higher-education",
        params as QueryParams,
      ),
  });
}

// --- Full Higher-Education Profile detail screen ---
// Backed by GET /me/principal/higher-education/:id/profile — every field
// maps to a real column on student_higher_education, or to the same real
// family/contact data the Student Profile screen already uses. A passport
// *expiry* date and a named contact-person for this flow have no backing
// anywhere in the schema, so neither appears here.

export interface HigherEducationProfile {
  id: number;
  student: {
    id: number;
    name: string;
    register_no: string | null;
    roll_no: string | null;
    photo_url: string | null;
    institute_email: string;
    mobile: string | null;
    passport_number: string | null;
  };
  batch: { id: number; name: string } | null;
  department: { id: number; name: string; code: string } | null;
  programme: string;
  university: string | null;
  country: string;
  is_abroad: boolean;
  intake_term: string | null;
  sop_status: string | null;
  recommendation_status: string | null;
  research_output: string | null;
  internship_details: string | null;
  visa_status: "not_applied" | "in_progress" | "applied" | "approved" | "rejected" | null;
  application_submitted_date: string | null;
  interview_date: string | null;
  offer_status: "awaited" | "received" | "accepted" | "declined" | null;
  funding_source: string | null;
  cgpa: number | null;
  percentage: number | null;
  test_scores_summary: string | null;
  is_scholarship: boolean | null;
  scholarship_name: string | null;
  scholarship_value: number | null;
  admission_status: "interested" | "applied" | "admitted" | "enrolled" | null;
  remarks: string | null;
  credits_earned: number;
  arrear_count: number;
  family: {
    father: { name: string | null; occupation: string | null; mobile: string | null; email: string | null; photo_url: string | null };
    mother: { name: string | null; occupation: string | null; mobile: string | null; email: string | null; photo_url: string | null };
    guardian: { name: string | null; relationship: string | null; is_father: boolean; mobile: string | null; email: string | null };
  } | null;
}

export function useHigherEducationProfile(id: number | undefined) {
  return useQuery({
    queryKey: ["me", "principal", "higher-education", "profile", id],
    queryFn: () => apiClient.get<HigherEducationProfile>(`/me/principal/higher-education/${id}/profile`),
    enabled: id !== undefined,
  });
}
