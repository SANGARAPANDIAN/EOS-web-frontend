import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export type LeaveStatus = "pending" | "faculty_approved" | "hod_approved" | "rejected";

export interface LeaveRow {
  id: number;
  from_date: string;
  to_date: string;
  reason: string | null;
  status: LeaveStatus;
  approved_by_faculty: string | null;
  approved_by_hod: string | null;
  created_at: string;
}

export interface LeaveListResponse {
  data: LeaveRow[];
  page: number;
  page_size: number;
  total: number;
}

/** GET /me/leaves */
export function useMyLeaves() {
  return useQuery({
    queryKey: ["me", "leaves"],
    queryFn: () => apiClient.get<LeaveListResponse>("/me/leaves"),
  });
}

export interface CreateLeaveInput {
  from_date: string;
  to_date: string;
  reason?: string;
}

/** POST /me/leaves */
export function useCreateLeave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateLeaveInput) => apiClient.post("/me/leaves", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me", "leaves"] }),
  });
}
