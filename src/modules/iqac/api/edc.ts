import { useQuery } from "@tanstack/react-query";
import { apiClient, type QueryParams } from "@/lib/api/client";

export interface EdcFilters {
  batches: { id: number; name: string }[];
  departments: { id: number; name: string; code: string }[];
}

/** GET /me/iqac/edc/filters */
export function useEdcFilters() {
  return useQuery({
    queryKey: ["me", "iqac", "edc", "filters"],
    queryFn: () => apiClient.get<EdcFilters>("/me/iqac/edc/filters"),
  });
}

export interface EdcSummary {
  students_in_edc: number;
  startups_beyond_idea: number;
  registered_ventures_count: number | null;
  incubated_count: number | null;
}

/** GET /me/iqac/edc/summary — registered/incubated counts are null (not 0) until the underlying columns are actually populated — never guessed. */
export function useEdcSummary() {
  return useQuery({
    queryKey: ["me", "iqac", "edc", "summary"],
    queryFn: () => apiClient.get<EdcSummary>("/me/iqac/edc/summary"),
  });
}

export interface EdcRow {
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
  /** Real incubations.status (freeform text, default 'Active') — null if this venture has no incubations row at all. */
  incubation_status: string | null;
  role: string | null;
  funding_required: number | null;
  remarks: string | null;
}

export interface EdcListParams {
  q?: string;
  batch_id?: number;
  department_id?: number;
  status?: string;
}

/** GET /me/iqac/edc — every real student_entrepreneurship venture. No faculty-mentor column: mentorship isn't tracked on this table. */
export function useEdcList(params: EdcListParams) {
  return useQuery({
    queryKey: ["me", "iqac", "edc", "list", params],
    queryFn: () => apiClient.get<{ total: number; records: EdcRow[] }>("/me/iqac/edc", params as QueryParams),
  });
}
