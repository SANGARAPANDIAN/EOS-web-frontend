import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export type LeaveStatus = "pending" | "faculty_approved" | "hod_approved" | "rejected" | "warden_approved";

export interface LeaveRow {
  id: number;
  from_date: string;
  to_date: string;
  reason: string | null;
  status: LeaveStatus;
  also_on_hostel_leave: boolean;
  routed_to_warden: boolean;
  approved_by_faculty: string | null;
  approved_by_hod: string | null;
  approved_by_warden: string | null;
  created_at: string;
}

export interface LeaveListResponse {
  data: LeaveRow[];
  page: number;
  page_size: number;
  total: number;
}

/**
 * GET /me/leaves — one table backs both the academic Leave tab and the
 * Hostel tab's own Leave form (see prisma/README.md). Pass `routedToWarden`
 * to narrow to just one or the other; omit it to get both mixed together.
 */
export function useMyLeaves(routedToWarden?: boolean) {
  return useQuery({
    queryKey: ["me", "leaves", routedToWarden ?? "all"],
    queryFn: () =>
      apiClient.get<LeaveListResponse>("/me/leaves", routedToWarden !== undefined ? { routed_to_warden: routedToWarden } : undefined),
  });
}

export interface CreateLeaveInput {
  from_date: string;
  to_date: string;
  reason?: string;
  also_on_hostel_leave?: boolean;
  /** Set only by the Hostel tab's own Leave form — routes straight to the Warden, skipping Faculty/HoD entirely. */
  routed_to_warden?: boolean;
}

/** POST /me/leaves */
export function useCreateLeave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateLeaveInput) => apiClient.post("/me/leaves", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me", "leaves"] }),
  });
}
