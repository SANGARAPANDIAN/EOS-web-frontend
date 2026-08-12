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
