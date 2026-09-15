import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface MarkAssignmentStatusInput {
  assignment_id: number;
  student_id: number;
  status_id: number | null;
  is_submitted: boolean;
}

/** PATCH /hod/my-class/assignment-status/mark — same underlying
 * `student_assignment_status` rows the LMS Task tab's submission panel
 * reads (assignment_id is a Task's id); HOD can't call the generic
 * Faculty-only /student-assignment-status endpoint, so this stays a
 * dedicated HOD-scoped mutation. */
export function useMarkHodAssignmentStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: MarkAssignmentStatusInput) => apiClient.patch("/hod/my-class/assignment-status/mark", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me", "lms"] }),
  });
}
