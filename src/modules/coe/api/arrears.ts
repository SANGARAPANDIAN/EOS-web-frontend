import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// src/modules/exams/arrears/arrears.controller.ts — new module, coe-only.
// "Standing arrear" = a subject whose latest official (non-internal) exam
// attempt is a fail, computed the same way as the real per-student
// student-exam-record.service.ts logic, just run once for the whole roster.

export type ArrearStatus = "registered" | "not_eligible" | "cleared" | "pending";

export interface ArrearStudentRow {
  id: number;
  register_no: string;
  name: string | null;
  department: { code: string; name: string } | null;
  year: number | null;
  standing_arrears_count: number;
  oldest_arrear: { subject_code: string; subject_name: string; standing_since: string; attempts: number } | null;
  status: ArrearStatus;
}

export interface ArrearOverview {
  stats: {
    arrear_students: number;
    arrear_students_pct_of_strength: number | null;
    standing_arrears_total: number;
    standing_arrears_avg_per_student: number | null;
    registered_for_arrear: number;
    registered_pct_of_eligible: number | null;
    cleared_last_cycle: number;
    cleared_last_cycle_delta: number;
  };
  students: ArrearStudentRow[];
}

export interface ArrearOverviewQuery {
  [key: string]: string | number | undefined;
  search?: string;
  department_id?: number;
  year?: number;
  status?: ArrearStatus;
}

export function useArrearOverview(query: ArrearOverviewQuery) {
  return useQuery({
    queryKey: ["coe", "arrears", "overview", query],
    queryFn: () => apiClient.get<ArrearOverview>("/arrears/overview", query),
  });
}

export interface ArrearStudentHistory {
  student: { id: number; register_no: string; name: string | null; department: { code: string; name: string } | null; year: number | null };
  standing_arrears: { subject_code: string; subject_name: string; standing_since: string; attempts: number }[];
  registered: boolean;
}

export function useArrearStudentHistory(studentId: number | null) {
  return useQuery({
    queryKey: ["coe", "arrears", "history", studentId],
    queryFn: () => apiClient.get<ArrearStudentHistory>(`/arrears/students/${studentId}/history`),
    enabled: studentId != null,
  });
}

/** POST /arrears/supplementary — real exams row (exam_category "supplementary") plus exam_subject_mapping for every currently-standing arrear course. */
export function useScheduleSupplementary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { title: string; starts_on: string; ends_on: string; fee_per_course: number }) =>
      apiClient.post("/arrears/supplementary", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coe", "arrears"] });
      queryClient.invalidateQueries({ queryKey: ["coe", "exams"] });
    },
  });
}
