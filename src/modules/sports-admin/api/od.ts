import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { ApprovalStatus, Ref } from "./types";

export interface OdRequest {
  id: number;
  od_type: string;
  event: string;
  from_date: string;
  to_date: string;
  venue: string | null;
  level: string | null;
  status: ApprovalStatus;
  squad_size: number;
  accompanying_coach: Ref | null;
}

export interface OdRequestDetail extends OdRequest {
  squad: { student_id: number; name: string; meta: string }[];
}

export interface CreateOdRequestInput {
  od_type: string;
  periods_affected?: string;
  from_date: string;
  to_date: string;
  event: string;
  venue?: string;
  level?: string;
  accompanying_coach_faculty_id?: number;
  transport?: string;
  remarks?: string;
  student_ids: number[];
}

export function useOdRequests(status?: ApprovalStatus) {
  return useQuery({
    queryKey: ["sports-admin", "od-requests", status],
    queryFn: () => apiClient.get<OdRequest[]>("/sports-admin/od-requests", { status }),
  });
}

export function useOdRequestDetail(id: number) {
  return useQuery({
    queryKey: ["sports-admin", "od-requests", id],
    queryFn: () => apiClient.get<OdRequestDetail>(`/sports-admin/od-requests/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateOdRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateOdRequestInput) => apiClient.post<OdRequest>("/sports-admin/od-requests", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sports-admin", "od-requests"] }),
  });
}

/*
 * There is deliberately no approve/reject hook here.
 *
 * A sports OD releases students from class, so it is approved by the HoD of
 * each department represented in the squad — a squad drawn from AIDS, CSE, ECE
 * and EEE needs all four HoDs. Sports raises the request and can watch its
 * progress; it cannot decide it. The backend enforces the same rule: those
 * routes are granted to the HoD role only.
 */

export interface OdDepartmentApproval {
  department_id: number;
  department_name: string | null;
  status: "pending" | "approved" | "rejected";
  reviewed_at: string | null;
  remarks: string | null;
  /** How many students in the squad belong to this department. */
  student_count: number;
}

/** GET /sports-admin/od-requests/:id/approvals — who still has to agree. */
export function useOdRequestApprovals(id: number | null) {
  return useQuery({
    queryKey: ["sports-admin", "od-requests", id, "approvals"],
    queryFn: () => apiClient.get<OdDepartmentApproval[]>(`/sports-admin/od-requests/${id}/approvals`),
    enabled: id != null,
  });
}
