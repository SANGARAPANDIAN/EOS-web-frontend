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

export function useApproveOdRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.post(`/sports-admin/od-requests/${id}/approve`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sports-admin", "od-requests"] }),
  });
}

export function useRejectOdRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.post(`/sports-admin/od-requests/${id}/reject`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sports-admin", "od-requests"] }),
  });
}
