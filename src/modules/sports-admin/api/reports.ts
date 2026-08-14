import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export type ReportStatus = "draft" | "scheduled" | "open";

export interface SportsReport {
  id: number;
  name: string;
  period_label: string | null;
  status: ReportStatus;
  created_by: { id: number; email: string } | null;
  updated_at: string;
}

export interface CreateReportInput {
  name: string;
  period_label?: string;
  status?: ReportStatus;
}

export function useSportsReports(status?: ReportStatus) {
  return useQuery({
    queryKey: ["sports-admin", "reports", status],
    queryFn: () => apiClient.get<SportsReport[]>("/sports-admin/reports", { status }),
  });
}

export function useCreateSportsReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateReportInput) => apiClient.post<SportsReport>("/sports-admin/reports", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sports-admin", "reports"] }),
  });
}

export function useUpdateSportsReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: Partial<CreateReportInput> & { id: number }) =>
      apiClient.patch(`/sports-admin/reports/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sports-admin", "reports"] }),
  });
}

export function useDeleteSportsReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/sports-admin/reports/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sports-admin", "reports"] }),
  });
}
