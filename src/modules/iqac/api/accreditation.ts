import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export type AccreditationCycle = "naac" | "aqar" | "ssr";

export interface AccreditationItemRow {
  id: number;
  code: string;
  criterion_number: number;
  name: string;
  owner: { id: number; name: string } | null;
  department: { id: number; code: string; name: string } | null;
  due_date: string | null;
  readiness_percent: number;
  status: "pending" | "in_progress" | "complete";
  note: string | null;
  evidence_count: number;
}

/** GET /me/iqac/accreditation/{naac,aqar,ssr}?department_id= — real iqac_accreditation_criteria rows, one cycle at a time. */
export function useAccreditationItems(cycle: AccreditationCycle, departmentId?: number | null) {
  return useQuery({
    queryKey: ["iqac", "accreditation", cycle, departmentId],
    queryFn: () => apiClient.get<AccreditationItemRow[]>(`/me/iqac/accreditation/${cycle}`, { department_id: departmentId ?? undefined }),
  });
}

export interface CreateAccreditationItemInput {
  criterion_number: number;
  name: string;
  owner_faculty_id?: number;
  department_id?: number;
  due_date?: string;
  readiness_percent?: number;
  status?: "pending" | "in_progress" | "complete";
  note?: string;
}

/** POST /me/iqac/accreditation/{naac,aqar,ssr} — real iqac_accreditation_criteria upsert (matches existing item by criterion number, or creates one). */
export function useCreateAccreditationItem(cycle: AccreditationCycle) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAccreditationItemInput) => apiClient.post(`/me/iqac/accreditation/${cycle}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["iqac", "accreditation", cycle] });
    },
  });
}

export type NbaCriterionStatus = "complete" | "missing" | "in_progress";

export interface NbaCriterionRow {
  id: number;
  code: string;
  name: string;
  max_marks: number;
  department: { id: number; name: string; code: string } | null;
  done_count: number;
  total_count: number;
  status: NbaCriterionStatus;
  items: { id: number; label: string; done: boolean }[];
}

export interface NbaOverview {
  readiness_pct: number;
  done_count: number;
  total_count: number;
  criteria: NbaCriterionRow[];
}

/** GET /me/iqac/accreditation/nba-overview?department_id= — real nba_criteria/nba_evidence_items data (Secretary-owned; read-only for IQAC). */
export function useNbaOverview(departmentId?: number | null) {
  return useQuery({
    queryKey: ["iqac", "accreditation", "nba-overview", departmentId],
    queryFn: () => apiClient.get<NbaOverview>("/me/iqac/accreditation/nba-overview", { department_id: departmentId ?? undefined }),
  });
}
