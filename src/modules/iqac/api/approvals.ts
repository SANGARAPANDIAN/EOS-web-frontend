import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export type ApprovalStatus = "pending" | "verified" | "missing";

export interface ApprovalRow {
  id: number;
  name: string;
  category: string;
  file_url: string | null;
  size_bytes: number | null;
  status: ApprovalStatus;
  version: number;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
  department: { id: number; name: string; code: string };
  uploaded_by: { id: number; email: string };
  verified_by: { id: number; email: string } | null;
}

export interface PaginatedApprovals {
  data: ApprovalRow[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface ApprovalsListParams {
  [key: string]: string | number | undefined;
  department_id?: number;
  status?: ApprovalStatus;
  category?: string;
  page?: number;
  limit?: number;
}

/** GET /me/iqac/approvals — delegates to DocumentsService.findAll(), the real department_documents register Secretary Portal already uses. */
export function useApprovalsList(params: ApprovalsListParams) {
  return useQuery({
    queryKey: ["iqac", "approvals", "list", params],
    queryFn: () => apiClient.get<PaginatedApprovals>("/me/iqac/approvals", params),
  });
}

export interface ApprovalsStats {
  pending_count: number;
  approved_count: number;
  missing_count: number;
  departments_reporting: number;
  departments_pending: number;
  categories: string[];
  /** "YYYY-MM", real, derived from every document's own created_at. */
  months: string[];
}

/** GET /me/iqac/approvals/stats — real, institution-wide counts (not scoped to one paginated page). No rejected_count: no "rejected" state exists in the real schema. */
export function useApprovalsStats() {
  return useQuery({
    queryKey: ["iqac", "approvals", "stats"],
    queryFn: () => apiClient.get<ApprovalsStats>("/me/iqac/approvals/stats"),
  });
}

/** PATCH /me/iqac/approvals/:id/verify — toggles pending<->verified. No "rejected" state exists in the real schema (only pending/verified/missing). */
export function useToggleApproval() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.patch<ApprovalRow>(`/me/iqac/approvals/${id}/verify`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["iqac", "approvals", "list"] }),
  });
}
