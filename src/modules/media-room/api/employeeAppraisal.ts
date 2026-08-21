import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface MediaRoomAppraisalCriterion {
  id: number;
  name: string;
  max_score: number;
}

export interface MediaRoomAppraisalDivision {
  id: number;
  name: string;
  criteria: MediaRoomAppraisalCriterion[];
}

export interface MediaRoomAppraisalCriteria {
  academic_year: string | null;
  divisions: MediaRoomAppraisalDivision[];
}

/** GET /media-room/employee/appraisal/criteria */
export function useMediaRoomAppraisalCriteria() {
  return useQuery({
    queryKey: ["media-room", "employee", "appraisal", "criteria"],
    queryFn: () => apiClient.get<MediaRoomAppraisalCriteria>("/media-room/employee/appraisal/criteria"),
  });
}

export interface MediaRoomAppraisalHistoryRow {
  id: number;
  academic_year: string;
  status: "submitted" | "hr_scored" | "management_approved" | "rejected";
  management_approved_at: string | null;
  created_at: string;
  entries: {
    id: number;
    description: string | null;
    score: number | null;
    criteria: { id: number; name: string; max_score: number };
  }[];
}

interface ReadyResponse<T> {
  ready: boolean;
  data: T[];
}

/** GET /media-room/employee/appraisal/history */
export function useMediaRoomAppraisalHistory() {
  return useQuery({
    queryKey: ["media-room", "employee", "appraisal", "history"],
    queryFn: () => apiClient.get<ReadyResponse<MediaRoomAppraisalHistoryRow>>("/media-room/employee/appraisal/history"),
  });
}

export interface ApplyMediaRoomAppraisalInput {
  academic_year: string;
  entries: { criteria_id: number; description?: string }[];
}

/** POST /media-room/employee/appraisal */
export function useApplyMediaRoomAppraisal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ApplyMediaRoomAppraisalInput) => apiClient.post("/media-room/employee/appraisal", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media-room", "employee", "appraisal"] });
    },
  });
}
