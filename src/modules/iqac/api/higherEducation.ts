import { useQuery } from "@tanstack/react-query";
import { apiClient, type QueryParams } from "@/lib/api/client";

export interface HigherEducationFilters {
  batches: { id: number; name: string }[];
  departments: { id: number; name: string; code: string }[];
}

/** GET /me/iqac/higher-education/filters */
export function useHigherEducationFilters() {
  return useQuery({
    queryKey: ["me", "iqac", "higher-education", "filters"],
    queryFn: () => apiClient.get<HigherEducationFilters>("/me/iqac/higher-education/filters"),
  });
}

export interface HigherEducationSummary {
  total: number;
  within_india: number;
  overseas: number;
  countries_count: number;
  countries: string[];
  scholarship_count: number;
  confirmed_admission_count: number;
}

/** GET /me/iqac/higher-education/summary — scholarship/admission figures are null (not 0) until the underlying columns are actually populated — never guessed. */
export function useHigherEducationSummary() {
  return useQuery({
    queryKey: ["me", "iqac", "higher-education", "summary"],
    queryFn: () => apiClient.get<HigherEducationSummary>("/me/iqac/higher-education/summary"),
  });
}

export type HigherEducationAdmissionStatus = "interested" | "applied" | "admitted" | "enrolled";

export interface HigherEducationRow {
  id: number;
  student: { id: number; name: string; register_no: string | null; roll_no: string | null };
  batch: { id: number; name: string } | null;
  department: { id: number; name: string; code: string } | null;
  section: string | null;
  /** 1-4, derived from the student's current_semester (Math.ceil(semester/2)) — null if no class/semester on file. */
  year: number | null;
  programme: string;
  university: string | null;
  country: string;
  is_abroad: boolean;
  remarks: string | null;
  is_scholarship: boolean | null;
  scholarship_name: string | null;
  admission_status: HigherEducationAdmissionStatus | null;
}

export interface HigherEducationListParams {
  q?: string;
  batch_id?: number;
  department_id?: number;
}

/** GET /me/iqac/higher-education — every real student_higher_education record. */
export function useHigherEducationList(params: HigherEducationListParams) {
  return useQuery({
    queryKey: ["me", "iqac", "higher-education", "list", params],
    queryFn: () =>
      apiClient.get<{ total: number; records: HigherEducationRow[] }>("/me/iqac/higher-education", params as QueryParams),
  });
}
