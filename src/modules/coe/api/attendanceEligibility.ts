import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// src/modules/exams/attendance-eligibility/ — new, coe-only. Real attendance
// % computed from the existing attendance_records table; condonation
// requests are a new table (query.md). 75% threshold is a documented
// constant (no per-student regulation resolution yet), same honest-constant
// pattern as marks-roster's grade bands.

export type Eligibility = "eligible" | "pending" | "detained";
export type CondonationStatus = "requested" | "approved" | "rejected";

export interface EligibilityRow {
  id: number;
  student_id_no: string;
  register_no: string | null;
  roll_no: string | null;
  name: string | null;
  department: { id: number; code: string; name: string } | null;
  semester: number | null;
  attendance_pct: number;
  shortfall_courses: number;
  condonation_status: CondonationStatus | null;
  condonation_id: number | null;
  eligibility: Eligibility;
}

export interface EligibilityStats {
  total: number;
  eligible_count: number;
  below_threshold_count: number;
  detained_count: number;
  condonation_pending_count: number;
  threshold_pct: number;
}

export function useEligibility(examId: number | null, filters: { department_id?: number | null; eligibility?: Eligibility | null; search?: string }) {
  return useQuery({
    queryKey: ["coe", "attendance-eligibility", examId, filters.department_id ?? null, filters.eligibility ?? null, filters.search ?? ""],
    queryFn: () =>
      apiClient.get<EligibilityRow[]>("/attendance-eligibility", {
        exam_id: examId ?? undefined,
        department_id: filters.department_id ?? undefined,
        eligibility: filters.eligibility ?? undefined,
        search: filters.search || undefined,
      }),
    enabled: examId != null,
  });
}

export function useEligibilityStats(examId: number | null) {
  return useQuery({
    queryKey: ["coe", "attendance-eligibility-stats", examId],
    queryFn: () => apiClient.get<EligibilityStats>("/attendance-eligibility/stats", { exam_id: examId ?? undefined }),
    enabled: examId != null,
  });
}

function invalidate(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["coe", "attendance-eligibility"] });
  queryClient.invalidateQueries({ queryKey: ["coe", "attendance-eligibility-stats"] });
}

export function useCreateCondonation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { student_id: number; exam_id: number; reason?: string }) => apiClient.post("/attendance-eligibility/condonation", input),
    onSuccess: () => invalidate(queryClient),
  });
}

export function useReviewCondonation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: "approved" | "rejected" }) =>
      apiClient.patch(`/attendance-eligibility/condonation/${id}`, { status }),
    onSuccess: () => invalidate(queryClient),
  });
}
