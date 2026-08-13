import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { PaginatedResult } from "@/types/api";

// Backend reference: src/modules/faculty/no-due/{no-due.controller,no-due.service}.ts
// GET /me/mentee-no-due/* — added this session: the original /me/no-due/*
// routes are HOD-only (confirmed via @Roles(ROLES.HOD) on NoDueController),
// so a class advisor genuinely had no endpoint to call at all. Added a
// parallel, read-only /me/mentee-no-due/* pair scoped by class_mentors
// instead of department_id, reusing the exact same real fee/library dues
// computation (NoDueService.queryNoDueStudents) — no approve action is
// exposed to this role, matching the design (no Approve button here).

export interface NoDueBatch {
  id: number;
  name: string;
}

/** GET /me/mentee-no-due/batches */
export function useMenteeNoDueBatches() {
  return useQuery({
    queryKey: ["me", "mentee-no-due", "batches"],
    queryFn: () => apiClient.get<NoDueBatch[]>("/me/mentee-no-due/batches"),
  });
}

export interface NoDueFeeCategory {
  category: string;
  cleared: boolean;
  pending_amount: number;
}

export interface NoDueStudentRow {
  id: number;
  name: string;
  student_id_no: string;
  roll_no: string | null;
  register_no: string | null;
  section: string | null;
  fees: NoDueFeeCategory[];
  library: { cleared: boolean; pending_amount: number };
  total_pending: number;
  override_approved: boolean;
}

/** GET /me/mentee-no-due/students?batch_id=&status=&search= — `status`
 * defaults to 'cleared' server-side, matching the HoD screen's own default. */
export function useMenteeNoDueStudents(params: { batch_id?: number; status?: "cleared" | "pending"; search?: string }) {
  return useQuery({
    queryKey: ["me", "mentee-no-due", "students", params],
    queryFn: async () => {
      const res = await apiClient.get<PaginatedResult<NoDueStudentRow>>("/me/mentee-no-due/students", { ...params, limit: 100 });
      return res.data;
    },
  });
}
