import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { PaginatedResult } from "@/types/api";

// Backend reference: src/modules/faculty/assignments/assignments.{controller,service}.ts
// Real routes (Controller('me') + @Get('assignments') concatenates to
// /me/assignments, /me/assignments/:id, /me/assignments/:id/students —
// verified against the decorators, not the (incorrect) docstrings in the file).

export interface AssignmentRow {
  id: number;
  academic_year: string;
  semester: number;
  sequence_no: number;
  title: string | null;
  class: { id: number; section: string };
  subject: { id: number; name: string; subject_code: string };
}

/** GET /me/assignments — AssignmentsService.findAll uses paginate(), so the
 * real response is {data, total, page, limit, totalPages}, not a bare
 * array. Unwrapped here so every consumer can keep treating the query's
 * `.data` as `AssignmentRow[]` directly. */
export function useAssignments() {
  return useQuery({
    queryKey: ["me", "assignments"],
    queryFn: async () => {
      // Pass a generous limit — the default page size would otherwise
      // silently truncate a faculty's full assignment list.
      const res = await apiClient.get<PaginatedResult<AssignmentRow>>("/me/assignments", { limit: 100 });
      return res.data;
    },
  });
}

export interface CreateAssignmentInput {
  class_id: number;
  subject_id: number;
  academic_year: string;
  semester: number;
  sequence_no: number;
  title?: string;
}

/** POST /me/assignments */
export function useCreateAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAssignmentInput) => apiClient.post<AssignmentRow>("/me/assignments", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me", "assignments"] }),
  });
}

export interface AssignmentStudentStatus {
  student_id: number;
  student_id_no: string;
  name: string;
  status_id: number | null;
  is_submitted: boolean;
  marked_at: string | null;
}

/** GET /me/assignments/:id/students */
export function useAssignmentStudents(assignmentId: number | undefined) {
  return useQuery({
    queryKey: ["me", "assignments", assignmentId, "students"],
    queryFn: () => apiClient.get<AssignmentStudentStatus[]>(`/me/assignments/${assignmentId}/students`),
    enabled: Boolean(assignmentId),
  });
}

/** PATCH /student-assignment-status/:id — toggles a student who already
 * has a status row. */
export function useUpdateAssignmentStudentStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ statusId, is_submitted }: { statusId: number; is_submitted: boolean }) =>
      apiClient.patch(`/student-assignment-status/${statusId}`, { is_submitted }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me", "assignments"] }),
  });
}

/** POST /student-assignment-status — creates the row for a student's FIRST
 * mark on an assignment. `/me/assignments/:id/students` returns
 * `status_id: null` for every student until this has been called once —
 * confirmed live: without this, "Mark submitted" had no working path at all
 * for a student's first submission. */
export function useCreateAssignmentStudentStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ assignmentId, studentId, is_submitted }: { assignmentId: number; studentId: number; is_submitted: boolean }) =>
      apiClient.post(`/student-assignment-status`, { assignment_id: assignmentId, student_id: studentId, is_submitted }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me", "assignments"] }),
  });
}

/** Convenience wrapper: creates the status row if it doesn't exist yet,
 * otherwise updates the existing one. Both underlying mutations invalidate
 * the same roster query, so either path refreshes the table correctly. */
export function useSetAssignmentStudentStatus() {
  const create = useCreateAssignmentStudentStatus();
  const update = useUpdateAssignmentStudentStatus();
  return {
    isPending: create.isPending || update.isPending,
    mutate: (args: { assignmentId: number; statusId: number | null; studentId: number; is_submitted: boolean }) => {
      if (args.statusId) {
        update.mutate({ statusId: args.statusId, is_submitted: args.is_submitted });
      } else {
        create.mutate({ assignmentId: args.assignmentId, studentId: args.studentId, is_submitted: args.is_submitted });
      }
    },
  };
}
