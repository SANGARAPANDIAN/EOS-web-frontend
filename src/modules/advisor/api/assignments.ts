import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// Backend reference: src/modules/faculty/assignments/assignments.{controller,service}.ts
// and src/modules/faculty/student-assignment-status/*.
//
// A Task in the LMS "Task" tab IS a row in this same `assignments` table
// (LmsService.createTask() writes straight into it) — there is no separate
// "assignment" entity. What's kept here is only the one capability the LMS
// Task submissions panel doesn't otherwise have: marking a student
// submitted/not-submitted by hand, without a real file upload. The former
// useAssignments/useAssignmentStudents/useCreateAssignment (a second,
// redundant read/list surface over the exact same rows the Task tab
// already lists) were removed as dead duplication, not a design choice —
// see PR history for the "Assignment Status" sidebar page this replaced.

/** PATCH /student-assignment-status/:id — toggles a student who already
 * has a status row. */
export function useUpdateAssignmentStudentStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ statusId, is_submitted }: { statusId: number; is_submitted: boolean }) =>
      apiClient.patch(`/student-assignment-status/${statusId}`, { is_submitted }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me", "lms"] }),
  });
}

/** POST /student-assignment-status — creates the row for a student's FIRST
 * mark on an assignment. The submissions list returns `status_id: null` for
 * every student until this has been called once — without this, "Mark
 * submitted" had no working path at all for a student's first submission. */
export function useCreateAssignmentStudentStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ assignmentId, studentId, is_submitted }: { assignmentId: number; studentId: number; is_submitted: boolean }) =>
      apiClient.post(`/student-assignment-status`, { assignment_id: assignmentId, student_id: studentId, is_submitted }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me", "lms"] }),
  });
}

/** Convenience wrapper: creates the status row if it doesn't exist yet,
 * otherwise updates the existing one. Both underlying mutations invalidate
 * the same LMS submissions query, so either path refreshes the Task tab's
 * submission list correctly. */
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
