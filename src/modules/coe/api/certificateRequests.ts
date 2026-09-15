import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// src/modules/exams/certificate-requests/ — coe-only. Real request → (fee
// clears / signs) → print → issue workflow. copies/delivery_mode/reason are
// new columns (see schema.prisma) — undefined/null until that migration is
// applied; render as "—" until then, same as question_papers.due_date earlier.

export type CertificateRequestStatus = "pending" | "ready_to_print" | "printed" | "issued";

export interface CertificateRequest {
  id: number;
  student_id: number;
  certificate_type_id: number;
  fee_amount: number | null;
  fee_paid: boolean;
  signatory_status: string;
  status: CertificateRequestStatus;
  requested_at: string;
  issued_at: string | null;
  copies?: number;
  delivery_mode?: "counter" | "post" | null;
  reason?: string | null;
  students: {
    id: number;
    student_id_no: string;
    roll_no: string | null;
    register_no: string | null;
    soa_applications: { first_name: string; last_name: string | null } | null;
    classes: { current_semester: number | null; departments: { id: number; code: string; name: string } } | null;
  };
  certificate_types: { id: number; name: string };
}

export interface CertificateType {
  id: number;
  name: string;
}

export interface CertificateRequestStats {
  total: number;
  issued: number;
  issued_pct_of_requests: number | null;
  awaiting_signature: number;
  duplicate_requests: number;
  duplicate_avg_fee: number | null;
  avg_turnaround_days: number | null;
  avg_turnaround_delta_days: number | null;
}

export interface CertificateRequestFilters {
  [key: string]: string | number | undefined;
  status?: CertificateRequestStatus;
  certificate_type_id?: number;
  department_id?: number;
  search?: string;
}

export function useCertificateRequests(filters: CertificateRequestFilters) {
  return useQuery({
    queryKey: ["coe", "certificate-requests", filters],
    queryFn: () => apiClient.get<CertificateRequest[]>("/certificate-requests", filters),
  });
}

export function useCertificateRequestStats() {
  return useQuery({
    queryKey: ["coe", "certificate-requests", "stats"],
    queryFn: () => apiClient.get<CertificateRequestStats>("/certificate-requests/stats"),
  });
}

export function useCertificateTypes() {
  return useQuery({
    queryKey: ["coe", "certificate-types"],
    queryFn: () => apiClient.get<CertificateType[]>("/certificate-requests/types"),
    staleTime: 5 * 60 * 1000,
    // See shared/api/departments.ts's useDepartments() for why gcTime needs
    // to be set well above staleTime — same reference-data reasoning.
    gcTime: 10 * 60 * 1000,
  });
}

export interface CreateCertificateRequestInput {
  student_id: number;
  certificate_type_id: number;
  fee_amount?: number;
  copies?: number;
  delivery_mode?: "counter" | "post";
  reason?: string;
}

export function useCreateCertificateRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCertificateRequestInput) => apiClient.post<CertificateRequest>("/certificate-requests", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coe", "certificate-requests"] });
    },
  });
}

export function useUpdateCertificateStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: CertificateRequestStatus }) =>
      apiClient.patch<CertificateRequest>(`/certificate-requests/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["coe", "certificate-requests"] }),
  });
}

export function useUpdateCertificateFee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, fee_paid }: { id: number; fee_paid: boolean }) =>
      apiClient.patch<CertificateRequest>(`/certificate-requests/${id}/fee`, { fee_paid }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["coe", "certificate-requests"] }),
  });
}

/** POST /certificate-requests/:id/remind — 409s if the request is no longer pending. */
export function useRemindCertificateRequest() {
  return useMutation({
    mutationFn: (id: number) => apiClient.post(`/certificate-requests/${id}/remind`),
  });
}
