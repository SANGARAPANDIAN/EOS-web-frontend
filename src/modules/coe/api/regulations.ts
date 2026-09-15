import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// src/modules/exams/regulations/ — new, coe-only. Real tables (regulations,
// regulation_courses) added specifically for the new COE Module design —
// query.md has the CREATE TABLE + seed the user ran themselves. Grade bands
// stat reads the real, pre-existing grade_bands table.

export type RegulationStatus = "active" | "phasing_out" | "draft";
export type RegulationLevel = "UG" | "PG";

export interface Regulation {
  id: number;
  code: string;
  applies_to_level: RegulationLevel;
  applies_to_description: string;
  intake_start_year: number;
  intake_end_year: number | null;
  grading_scale: string;
  pass_aggregate_pct: string | null;
  pass_external_pct: string | null;
  attendance_threshold_pct: string;
  moderation_ceiling_marks: number;
  moderation_ceiling_candidate_pct: string;
  status: RegulationStatus;
  created_at: string;
  updated_at: string;
  regulation_courses: { course_id: number }[];
}

export interface RegulationStats {
  total: number;
  active_count: number;
  phasing_out_count: number;
  draft_count: number;
  programmes_mapped: number;
  grade_bands_count: number;
  moderation_ceiling_marks: number | null;
  moderation_ceiling_candidate_pct: string | null;
}

export interface RegulationsFilters {
  status?: RegulationStatus | null;
  level?: RegulationLevel | null;
  scale?: string | null;
  search?: string;
}

export function useRegulations(filters: RegulationsFilters) {
  return useQuery({
    queryKey: ["coe", "regulations", filters.status ?? null, filters.level ?? null, filters.scale ?? null, filters.search ?? ""],
    queryFn: () =>
      apiClient.get<Regulation[]>("/regulations", {
        status: filters.status ?? undefined,
        level: filters.level ?? undefined,
        scale: filters.scale ?? undefined,
        search: filters.search || undefined,
      }),
  });
}

export function useRegulationStats() {
  return useQuery({
    queryKey: ["coe", "regulation-stats"],
    queryFn: () => apiClient.get<RegulationStats>("/regulations/stats"),
  });
}

export interface CreateRegulationInput {
  code: string;
  applies_to_level: RegulationLevel;
  applies_to_description: string;
  intake_start_year: number;
  intake_end_year?: number;
  grading_scale?: string;
  pass_aggregate_pct?: number;
  pass_external_pct?: number;
  attendance_threshold_pct?: number;
  moderation_ceiling_marks?: number;
  moderation_ceiling_candidate_pct?: number;
  status?: RegulationStatus;
}

function invalidateRegulations(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["coe", "regulations"] });
  queryClient.invalidateQueries({ queryKey: ["coe", "regulation-stats"] });
}

export function useCreateRegulation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRegulationInput) => apiClient.post<Regulation>("/regulations", input),
    onSuccess: () => invalidateRegulations(queryClient),
  });
}

export function useUpdateRegulation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number } & Partial<CreateRegulationInput>) =>
      apiClient.patch<Regulation>(`/regulations/${id}`, body),
    onSuccess: () => invalidateRegulations(queryClient),
  });
}

export function useCloneRegulation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, new_code }: { id: number; new_code: string }) =>
      apiClient.post<Regulation>(`/regulations/${id}/clone`, { new_code }),
    onSuccess: () => invalidateRegulations(queryClient),
  });
}

export function useSubmitRegulation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.post<Regulation>(`/regulations/${id}/submit`),
    onSuccess: () => invalidateRegulations(queryClient),
  });
}
