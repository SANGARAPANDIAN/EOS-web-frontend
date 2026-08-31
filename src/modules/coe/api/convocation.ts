import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// src/modules/exams/convocation/ — coe-only. "Verify a candidate" is the
// real write path — it recomputes CGPA/arrears/classification/eligibility
// from real marks, malpractice holds and unpaid fee registrations (same
// join as student-exam-record.service.ts) and upserts convocation_registrations.
// convocation_batch/merit_list_eligible/remarks are new columns (see
// schema.prisma) — undefined/null until that migration is applied, same
// as certificate_requests.copies before it.

export type ConvocationStatus = "eligible" | "shortfall" | "registered" | "degree_awarded";

export interface ConvocationRegistration {
  id: number;
  student_id: number;
  cgpa: number | null;
  arrears_count: number;
  classification: string | null;
  status: ConvocationStatus;
  registered_at: string | null;
  convocation_batch?: string | null;
  merit_list_eligible?: boolean;
  remarks?: string | null;
  students: {
    id: number;
    student_id_no: string;
    roll_no: string | null;
    register_no: string | null;
    soa_applications: { first_name: string; last_name: string | null } | null;
    classes: { current_semester: number | null; departments: { id: number; code: string; name: string }; courses: { name: string } | null } | null;
  };
}

export interface ConvocationStats {
  provisionally_eligible: number;
  final_year_strength: number;
  with_shortfall: number;
  shortfall_arrears: number;
  shortfall_dues_or_records: number;
  convocation_registered: number;
  registered_pct_of_eligible: number | null;
  gold_medal_candidates: number;
}

export interface ConvocationFilters {
  [key: string]: string | undefined;
  status?: ConvocationStatus;
  search?: string;
}

export function useConvocationRegistrations(filters: ConvocationFilters) {
  return useQuery({
    queryKey: ["coe", "convocation-registrations", filters],
    queryFn: () => apiClient.get<ConvocationRegistration[]>("/convocation-registrations", filters),
  });
}

export function useConvocationStats() {
  return useQuery({
    queryKey: ["coe", "convocation-registrations", "stats"],
    queryFn: () => apiClient.get<ConvocationStats>("/convocation-registrations/stats"),
  });
}

/** POST /convocation-registrations/verify — recomputes eligibility from real academic data and upserts the registration. */
export function useVerifyConvocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { student_id: number; convocation_batch?: string; merit_list_eligible?: boolean; remarks?: string }) =>
      apiClient.post<ConvocationRegistration>("/convocation-registrations/verify", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coe", "convocation-registrations"] });
    },
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

/** POST /convocation-registrations/:id/notify — 400s if the row isn't currently in shortfall. */
export function useNotifyConvocation() {
  return useMutation({
    mutationFn: (id: number) => apiClient.post(`/convocation-registrations/${id}/notify`),
  });
}
