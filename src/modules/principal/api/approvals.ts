import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, type QueryParams } from "@/lib/api/client";

export interface ApprovalsSummary {
  pending: number;
  accepted: number;
  rejected: number;
  total: number;
  average_close_days: number | null;
  oldest_pending_created_at: string | null;
}

/** GET /me/principal/approvals/summary — Leave + OD requests only: the only two workflows with a real Principal approval stage (see query.md #6). */
export function useApprovalsSummary() {
  return useQuery({
    queryKey: ["me", "principal", "approvals", "summary"],
    queryFn: () => apiClient.get<ApprovalsSummary>("/me/principal/approvals/summary"),
  });
}

export type ApprovalStatusFilter = "pending" | "approved" | "rejected" | "all";
export type ApprovalKindFilter = "leave" | "od" | "all";

export interface ApprovalItem {
  id: number;
  kind: "leave" | "od";
  faculty: { id: number; name: string; designation: string; department_code: string | null };
  from_date: string;
  to_date: string;
  summary: string;
  hod_approval_status: string;
  hr_approval_status: string;
  principal_approval_status: "pending" | "approved" | "rejected";
  principal_remarks: string | null;
  principal_decided_at: string | null;
  created_at: string;
}

export interface ApprovalsListParams {
  status?: ApprovalStatusFilter;
  kind?: ApprovalKindFilter;
  q?: string;
}

/** GET /me/principal/approvals */
export function useApprovalsList(params: ApprovalsListParams) {
  return useQuery({
    queryKey: ["me", "principal", "approvals", "list", params],
    queryFn: () => apiClient.get<{ total: number; items: ApprovalItem[] }>("/me/principal/approvals", params as QueryParams),
  });
}

/** PATCH /me/principal/approvals/:kind/:id */
export function useDecideApproval() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ kind, id, decision, remarks }: { kind: "leave" | "od"; id: number; decision: "approved" | "rejected"; remarks?: string }) =>
      apiClient.patch<ApprovalItem>(`/me/principal/approvals/${kind}/${id}`, { decision, remarks }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me", "principal", "approvals"] });
    },
  });
}
