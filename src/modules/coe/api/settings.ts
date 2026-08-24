import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// src/modules/exams/pass-rules/ — coe-only, singleton row over the existing
// exam_pass_rules_settings table (previously unused by any code). Grade
// scale and roles/access have no backing table at all (confirmed this
// session) — no hooks for those; the Settings page shows an honest gap note
// instead.

export interface PassRules {
  id: number;
  internal_max_marks: number;
  external_max_marks: number;
  pass_mark_total: number;
  min_external_marks: number;
  updated_at: string;
}

export function usePassRules() {
  return useQuery({
    queryKey: ["coe", "pass-rules"],
    queryFn: () => apiClient.get<PassRules>("/pass-rules"),
  });
}

export interface UpdatePassRulesInput {
  internal_max_marks?: number;
  external_max_marks?: number;
  pass_mark_total?: number;
  min_external_marks?: number;
}

export function useUpdatePassRules() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdatePassRulesInput) => apiClient.patch<PassRules>("/pass-rules", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["coe", "pass-rules"] }),
  });
}
