import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export type AppraisalStatus = "pending" | "sent_to_hr" | "sent_back";

export interface HodAppraisalRow {
  id: number;
  faculty_name: string;
  designation: string;
  submitted_at: string;
  cycle_academic_year: string;
  entries_count: number;
  self_score: number | null;
  status: AppraisalStatus;
  can_act: boolean;
}

export interface HodAppraisalRequests {
  department: { name: string; code: string };
  counts: { pending: number; sent_to_hr: number; sent_back: number; all: number };
  rows: HodAppraisalRow[];
}

/** GET /hod/appraisal-requests */
export function useHodAppraisalRequests() {
  return useQuery({
    queryKey: ["hod", "appraisal-requests"],
    queryFn: () => apiClient.get<HodAppraisalRequests>("/hod/appraisal-requests"),
  });
}

export interface HodAppraisalEntry {
  id: number;
  division: string;
  criteria_name: string;
  description: string | null;
  score: number | null;
  max_score: number;
}

export interface HodAppraisalDetail {
  id: number;
  faculty_name: string;
  designation: string;
  cycle_academic_year: string;
  submitted_at: string;
  status: AppraisalStatus;
  hod_remarks: string | null;
  entries: HodAppraisalEntry[];
}

/** GET /hod/appraisal-requests/:id */
export function useHodAppraisalDetail(id: number) {
  return useQuery({
    queryKey: ["hod", "appraisal-requests", "detail", id],
    queryFn: () => apiClient.get<HodAppraisalDetail>(`/hod/appraisal-requests/${id}`),
    enabled: Number.isFinite(id),
  });
}

/** PATCH /hod/appraisal-requests/:id */
export function useDecideHodAppraisal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      decision,
      remarks,
    }: {
      id: number;
      decision: "approved" | "rejected";
      remarks?: string;
    }) => apiClient.patch(`/hod/appraisal-requests/${id}`, { decision, remarks }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hod", "appraisal-requests"] }),
  });
}
