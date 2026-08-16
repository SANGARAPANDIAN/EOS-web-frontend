import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// Backend reference: EOSbackend1/src/modules/secretary-portal/accreditation/
// *.{controller,service}.ts — new module built this session (real
// `nba_criteria`/`nba_evidence_items` tables, added via the Secretary
// module completion migration). Institution-wide for Secretary/Admin/
// Principal. Starts empty (new tables) — criteria/evidence items are real
// once created via the composer, not pre-seeded fake data.

export interface EvidenceItem {
  id: number;
  label: string;
  done: boolean;
}
export interface CriterionRow {
  id: number;
  code: string;
  name: string;
  max_marks: number;
  done_count: number;
  total_count: number;
  status: "complete" | "in_progress" | "missing";
  items: EvidenceItem[];
}
export interface AccreditationOverview {
  readiness_pct: number;
  done_count: number;
  total_count: number;
  criteria: CriterionRow[];
}

export function useAccreditationOverview(departmentId: number | undefined) {
  const qs = departmentId !== undefined ? `?department_id=${departmentId}` : "";
  return useQuery({
    queryKey: ["secretary", "accreditation", departmentId],
    queryFn: () => apiClient.get<AccreditationOverview>(`/me/nba/overview${qs}`),
  });
}

export function useCreateCriterion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { department_id: number; code: string; name: string; max_marks: number }) => apiClient.post("/me/nba/criteria", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["secretary", "accreditation"] }),
  });
}

export function useAddEvidenceItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ criterionId, label }: { criterionId: number; label: string }) => apiClient.post(`/me/nba/criteria/${criterionId}/evidence-items`, { label }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["secretary", "accreditation"] }),
  });
}

export function useToggleEvidenceItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.patch(`/me/nba/evidence-items/${id}/toggle`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["secretary", "accreditation"] }),
  });
}
