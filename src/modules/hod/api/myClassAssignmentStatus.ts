import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface HodHandledClass {
  class_id: number;
  subject_id: number;
  academic_year: string;
  section: string;
  semester: number | null;
  department_name: string;
  subject_name: string;
  subject_code: string;
}

export interface HodAssignmentOption {
  id: number;
  academic_year: string;
  semester: number;
  sequence_no: number;
  title: string | null;
  class: { id: number; section: string };
  subject: { id: number; name: string; subject_code: string };
}

export interface HodAssignmentDetail extends HodAssignmentOption {
  due_date: string | null;
  max_marks: number | null;
}

export interface HodAssignmentStudentRow {
  student_id: number;
  student_id_no: string;
  name: string;
  email: string | null;
  status_id: number | null;
  is_submitted: boolean;
  marked_at: string | null;
}

export interface HodAssignmentStatusOverview {
  handled_classes: HodHandledClass[];
  selected_class?: HodHandledClass & { year_label: string | null };
  assignments: HodAssignmentOption[];
  assignment: HodAssignmentDetail | null;
  students: HodAssignmentStudentRow[];
}

/** GET /hod/my-class/assignment-status?class_id=&subject_id=&assignment_id= */
export function useHodAssignmentStatus(classId?: number, subjectId?: number, assignmentId?: number) {
  return useQuery({
    queryKey: ["hod", "my-class", "assignment-status", classId, subjectId, assignmentId],
    queryFn: () =>
      apiClient.get<HodAssignmentStatusOverview>("/hod/my-class/assignment-status", {
        class_id: classId,
        subject_id: subjectId,
        assignment_id: assignmentId,
      }),
  });
}

export interface MarkAssignmentStatusInput {
  assignment_id: number;
  student_id: number;
  status_id: number | null;
  is_submitted: boolean;
}

/** PATCH /hod/my-class/assignment-status/mark */
export function useMarkHodAssignmentStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: MarkAssignmentStatusInput) => apiClient.patch("/hod/my-class/assignment-status/mark", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hod", "my-class", "assignment-status"] }),
  });
}
