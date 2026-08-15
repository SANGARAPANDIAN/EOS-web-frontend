import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { ApprovalStatus } from "./types";

export interface BudgetRequest {
  id: number;
  title: string;
  description: string | null;
  amount: number;
  status: ApprovalStatus;
  raised_by: { id: number; email: string };
  reviewed_by: { id: number; email: string } | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface CreateBudgetRequestInput {
  title: string;
  description?: string;
  amount: number;
  budget_allocation_id?: number;
}

export function useBudgetRequests(status?: ApprovalStatus) {
  return useQuery({
    queryKey: ["sports-admin", "budget-requests", status],
    queryFn: () => apiClient.get<BudgetRequest[]>("/sports-admin/budget-requests", { status }),
  });
}

export function useCreateBudgetRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBudgetRequestInput) => apiClient.post<BudgetRequest>("/sports-admin/budget-requests", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sports-admin", "budget-requests"] }),
  });
}

export function useApproveBudgetRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.post(`/sports-admin/budget-requests/${id}/approve`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sports-admin", "budget-requests"] }),
  });
}

export function useRejectBudgetRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.post(`/sports-admin/budget-requests/${id}/reject`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sports-admin", "budget-requests"] }),
  });
}
