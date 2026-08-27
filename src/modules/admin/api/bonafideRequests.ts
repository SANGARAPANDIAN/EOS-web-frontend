import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export type BonafideStatus = "pending" | "faculty_approved" | "issued" | "rejected";

export interface BonafideReason {
  id: number;
  reason_text: string;
}

export interface BonafideRequestStudent {
  id: number;
  student_id_no: string;
  register_no: string | null;
  roll_no: string | null;
  admission_no: string | null;
  first_name: string | null;
  last_name: string | null;
  batch: { id: number; name: string } | null;
  class: { id: number; section: string } | null;
  course: { id: number; name: string } | null;
  department: { id: number; name: string; code: string } | null;
}

export interface BonafideRequestListItem {
  id: number;
  status: BonafideStatus;
  requested_at: string;
  issued_at: string | null;
  reason: BonafideReason;
  student: BonafideRequestStudent;
}

export interface BonafideRequestDetail extends BonafideRequestListItem {
  student: BonafideRequestStudent & {
    gender: string | null;
    date_of_birth: string | null;
    father_name: string | null;
    mother_name: string | null;
  };
}

export interface BonafideRequestsListResponse {
  data: BonafideRequestListItem[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface ListBonafideRequestsParams {
  status?: BonafideStatus | "all";
  reason_id?: number;
  q?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export function useBonafideRequests(params: ListBonafideRequestsParams) {
  const { status, ...rest } = params;
  return useQuery({
    queryKey: ["admin", "bonafide-requests", "list", params],
    queryFn: () =>
      apiClient.get<BonafideRequestsListResponse>("/admin/bonafide-requests", {
        ...rest,
        status: status && status !== "all" ? status : undefined,
      }),
    placeholderData: keepPreviousData,
  });
}

export function useBonafideRequest(id: number | null) {
  return useQuery({
    queryKey: ["admin", "bonafide-requests", "detail", id],
    queryFn: () => apiClient.get<BonafideRequestDetail>(`/admin/bonafide-requests/${id}`),
    enabled: id !== null,
  });
}

export function useDecideBonafideRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision }: { id: number; decision: "approve" | "reject" }) =>
      apiClient.patch<BonafideRequestDetail>(`/admin/bonafide-requests/${id}/decision`, { decision }),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "bonafide-requests", "list"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "bonafide-requests", "detail", id] });
    },
  });
}

export function usePrintBonafideRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.patch<BonafideRequestDetail>(`/admin/bonafide-requests/${id}/print`, {}),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "bonafide-requests", "list"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "bonafide-requests", "detail", id] });
    },
  });
}
