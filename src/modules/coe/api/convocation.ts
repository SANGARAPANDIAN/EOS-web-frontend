import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// src/modules/exams/convocation/ — new, coe-only. convocation_registrations
// table (query.md); records are seeded from eligibility, not created here —
// the only real writes are the register/award-degree status transitions.

export type ConvocationStatus = "eligible" | "shortfall" | "registered" | "degree_awarded";

export interface ConvocationRegistration {
  id: number;
  student_id: number;
  cgpa: number | null;
  arrears_count: number;
  classification: string | null;
  status: ConvocationStatus;
  registered_at: string | null;
  students: {
    id: number;
    student_id_no: string;
    roll_no: string | null;
    register_no: string | null;
    soa_applications: { first_name: string; last_name: string | null } | null;
    classes: { current_semester: number | null; departments: { id: number; code: string; name: string } } | null;
  };
}

export interface ConvocationStats {
  eligible: number;
  shortfall: number;
  registered: number;
  degree_awarded: number;
}

export interface ConvocationFilters {
  status?: ConvocationStatus | null;
  search?: string;
}

export function useConvocationRegistrations(filters: ConvocationFilters) {
  return useQuery({
    queryKey: ["coe", "convocation-registrations", filters],
    queryFn: () => apiClient.get<ConvocationRegistration[]>("/convocation-registrations", { status: filters.status ?? undefined, search: filters.search || undefined }),
  });
}

export function useConvocationStats() {
  return useQuery({
    queryKey: ["coe", "convocation-registrations", "stats"],
    queryFn: () => apiClient.get<ConvocationStats>("/convocation-registrations/stats"),
  });
}

export function useRegisterForConvocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.patch<ConvocationRegistration>(`/convocation-registrations/${id}/register`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["coe", "convocation-registrations"] }),
  });
}

export function useAwardDegree() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.patch<ConvocationRegistration>(`/convocation-registrations/${id}/award-degree`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["coe", "convocation-registrations"] }),
  });
}
