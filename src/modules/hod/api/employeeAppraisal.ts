import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface HodAppraisalCriterion {
  id: number;
  name: string;
  max_score: number;
}

export interface HodAppraisalDivision {
  id: number;
  name: string;
  criteria: HodAppraisalCriterion[];
}

export interface HodAppraisalCriteria {
  academic_year: string | null;
  divisions: HodAppraisalDivision[];
}

/** GET /hod/employee/appraisal/criteria?academic_year= */
export function useHodAppraisalCriteria() {
  return useQuery({
    queryKey: ["hod", "employee", "appraisal", "criteria"],
    queryFn: () => apiClient.get<HodAppraisalCriteria>("/hod/employee/appraisal/criteria"),
  });
}

export interface HodAppraisalHistoryRow {
  id: number;
  academic_year: string;
  status: "submitted" | "hod_reviewed" | "hr_scored" | "management_approved" | "rejected";
  hod_reviewed_at: string | null;
  management_approved_at: string | null;
  created_at: string;
  entries: {
    id: number;
    description: string | null;
    score: number | null;
    criteria: { id: number; name: string; max_score: number; division: { id: number; name: string } };
  }[];
}

/** GET /hod/employee/appraisal/history */
export function useHodAppraisalHistory() {
  return useQuery({
    queryKey: ["hod", "employee", "appraisal", "history"],
    queryFn: () => apiClient.get<HodAppraisalHistoryRow[]>("/hod/employee/appraisal/history"),
  });
}

export interface ApplyAppraisalInput {
  academic_year: string;
  entries: { criteria_id: number; description?: string }[];
}

/** POST /hod/employee/appraisal */
export function useApplyHodAppraisal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ApplyAppraisalInput) => apiClient.post("/hod/employee/appraisal", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hod", "employee", "appraisal"] });
    },
  });
}
