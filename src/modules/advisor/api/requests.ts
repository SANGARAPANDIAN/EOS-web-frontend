import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// Backend reference: GET /me/student-leaves (StudentLeavesController) and
// GET /me/student-ods (StudentOdsController), FACULTY+HOD, scoped to the
// faculty's mentee classes. Exact shapes confirmed by reading the services —
// leave rows nest the student under `student`, OD rows nest it under
// `creator` (the OD requester) — deliberately not unified into one shape
// here since the backend doesn't unify them either.

export interface StudentLeaveRow {
  id: number;
  student_id: number;
  student: { id: number; student_id_no: string; name: string; section: string | null; department_name: string | null };
  from_date: string;
  to_date: string;
  reason: string | null;
  status: string;
  created_at: string;
}

export interface StudentOdRow {
  id: number;
  team_id: number;
  unique_code: string;
  member_count: number;
  creator: { id: number; student_id_no: string; name: string; section: string | null; department_name: string | null };
  /** Every other real student on this OD team (creator excluded) — who the "+N more" on the card actually refers to. */
  other_members: { id: number; student_id_no: string; name: string }[];
  from_date: string;
  to_date: string;
  from_time: string | null;
  to_time: string | null;
  reason: string | null;
  faculty_guide_name: string | null;
  mentor_approval_status: string;
  created_at: string;
}

/** GET /me/student-leaves — paginated; a generous limit avoids silently
 * truncating the list under whatever the backend's default page size is. */
export function useStudentLeaves() {
  return useQuery({
    queryKey: ["me", "student-leaves"],
    queryFn: () => apiClient.get<{ data: StudentLeaveRow[]; total?: number; meta?: { total: number } }>("/me/student-leaves", { limit: 100 }),
  });
}

/** GET /me/student-ods — paginated, same note as above. */
export function useStudentOds() {
  return useQuery({
    queryKey: ["me", "student-ods"],
    queryFn: () => apiClient.get<{ data: StudentOdRow[]; total?: number; meta?: { total: number } }>("/me/student-ods", { limit: 100 }),
  });
}

export function usePendingStudentLeaveCount() {
  const q = useStudentLeaves();
  return { ...q, data: q.data?.data.filter((r) => r.status === "pending").length };
}

export function usePendingStudentOdCount() {
  const q = useStudentOds();
  return { ...q, data: q.data?.data.filter((r) => r.mentor_approval_status === "pending").length };
}

/** PATCH /me/student-leaves/:id/faculty-approve */
export function useFacultyApproveLeave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision }: { id: number; decision: "approved" | "rejected" }) =>
      apiClient.patch<StudentLeaveRow>(`/me/student-leaves/${id}/faculty-approve`, { decision }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me", "student-leaves"] }),
  });
}

/** PATCH /me/student-ods/:id/faculty-approve */
export function useFacultyApproveOd() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision }: { id: number; decision: "approved" | "rejected" }) =>
      apiClient.patch<StudentOdRow>(`/me/student-ods/${id}/faculty-approve`, { decision }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me", "student-ods"] }),
  });
}
