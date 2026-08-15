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
