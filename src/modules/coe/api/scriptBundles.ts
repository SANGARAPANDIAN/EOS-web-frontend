import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// src/modules/exams/script-bundles/ — new, coe-only. Dummy-numbered blind
// valuation over new script_bundles/script_bundle_marks tables (query.md).

export type BundleStatus = "allotted" | "under_valuation" | "submitted";

export interface ScriptBundle {
  id: number;
  exam_id: number;
  bundle_code: string;
  dummy_range_start: number;
  dummy_range_end: number;
  subject: { id: number; name: string; subject_code: string };
  department: { id: number; code: string; name: string } | null;
  valuator: { id: number; first_name: string; last_name: string } | null;
  scripts_count: number;
  entered_count: number;
  status: BundleStatus;
  is_second_valuation: boolean;
}

export interface BundleStats {
  scripts_valued: number;
  total_scripts: number;
  valuators_on_camp: number;
  second_valuation_count: number;
  bundles_count: number;
  daily_throughput: number;
}

export interface ScriptBundleFilters {
  status?: BundleStatus | null;
  department_id?: number | null;
  is_second_valuation?: boolean | null;
  search?: string;
}

export interface MarkSheetRow {
  dummy_number: number;
  part_a_marks: number | null;
  part_b_marks: number | null;
  part_c_marks: number | null;
  total_marks: number | null;
  is_absent: boolean;
}

export interface MarkSheet {
  bundle: { id: number; bundle_code: string; status: BundleStatus; subject: { id: number; name: string; subject_code: string }; valuator: { id: number; first_name: string; last_name: string } | null };
  rows: MarkSheetRow[];
}

/** GET /script-bundles with no exam_id — the real backend DTO already treats exam_id as optional; used only to pick a sensible default exam (the one with the most bundles) instead of defaulting to the highest exam id. */
export function useAllScriptBundles() {
  return useQuery({
    queryKey: ["coe", "script-bundles", "all"],
    queryFn: () => apiClient.get<ScriptBundle[]>("/script-bundles"),
  });
}

export function useScriptBundles(examId: number | null, filters: ScriptBundleFilters = {}) {
  return useQuery({
    queryKey: ["coe", "script-bundles", examId, filters.status ?? null, filters.department_id ?? null, filters.is_second_valuation ?? null, filters.search ?? ""],
    queryFn: () =>
      apiClient.get<ScriptBundle[]>("/script-bundles", {
        exam_id: examId ?? undefined,
        status: filters.status ?? undefined,
        department_id: filters.department_id ?? undefined,
        is_second_valuation: filters.is_second_valuation ?? undefined,
        search: filters.search || undefined,
      }),
    enabled: examId != null,
  });
}

export function useBundleStats(examId: number | null) {
  return useQuery({
    queryKey: ["coe", "script-bundle-stats", examId],
    queryFn: () => apiClient.get<BundleStats>("/script-bundles/stats", { exam_id: examId ?? undefined }),
    enabled: examId != null,
  });
}

export function useAllocateBundle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      bundle_code: string;
      exam_subject_mapping_id: number;
      valuator_faculty_id?: number;
      dummy_range_start: number;
      dummy_range_end: number;
      expected_return_at?: string;
    }) => apiClient.post<ScriptBundle>("/script-bundles", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coe", "script-bundles"] });
      queryClient.invalidateQueries({ queryKey: ["coe", "script-bundle-stats"] });
    },
  });
}

export function useMarkSheet(bundleId: number | null) {
  return useQuery({
    queryKey: ["coe", "mark-sheet", bundleId],
    queryFn: () => apiClient.get<MarkSheet>(`/script-bundles/${bundleId}/sheet`),
    enabled: bundleId != null,
  });
}

export function useEnterScriptMark() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bundleId, ...body }: { bundleId: number; dummy_number: number; part_a_marks?: number; part_b_marks?: number; part_c_marks?: number; is_absent?: boolean }) =>
      apiClient.post<MarkSheet>(`/script-bundles/${bundleId}/marks`, body),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["coe", "mark-sheet", vars.bundleId] });
      queryClient.invalidateQueries({ queryKey: ["coe", "script-bundles"] });
    },
  });
}

export function useSubmitBundle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bundleId: number) => apiClient.post<ScriptBundle>(`/script-bundles/${bundleId}/submit`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coe", "script-bundles"] });
      queryClient.invalidateQueries({ queryKey: ["coe", "mark-sheet"] });
    },
  });
}
