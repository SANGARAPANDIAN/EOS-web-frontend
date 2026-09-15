import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface SubjectNoDueMapping {
  mapping_id: number;
  subject: { id: number; name: string; code: string };
  class: {
    id: number;
    section: string;
    semester: number | null;
    batch_label: string;
    department_code: string;
  };
}

/** GET /me/subject-no-due/mappings — subjects this faculty currently handles (as handler or substitute), for the class/subject picker. */
export function useSubjectNoDueMappings() {
  return useQuery({
    queryKey: ["me", "subject-no-due", "mappings"],
    queryFn: () => apiClient.get<SubjectNoDueMapping[]>("/me/subject-no-due/mappings"),
  });
}

export interface SubjectNoDueRow {
  student_id: number;
  register_no: string;
  name: string;
  internal1_cleared: boolean;
  internal2_cleared: boolean;
  project_cleared: boolean;
  assignment_cleared: boolean;
  quiz_cleared: boolean;
}

/** GET /me/subject-no-due/students?mapping_id= */
export function useSubjectNoDueStudents(mappingId: number | null) {
  return useQuery({
    queryKey: ["me", "subject-no-due", "students", mappingId],
    queryFn: () => apiClient.get<SubjectNoDueRow[]>("/me/subject-no-due/students", { mapping_id: mappingId ?? undefined }),
    enabled: mappingId !== null,
  });
}

export type SubjectNoDueField = "internal1_cleared" | "internal2_cleared" | "project_cleared" | "assignment_cleared" | "quiz_cleared";

/** PATCH /me/subject-no-due/students/:studentId?mapping_id= */
export function useUpdateSubjectNoDue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      mappingId,
      studentId,
      patch,
    }: {
      mappingId: number;
      studentId: number;
      patch: Partial<Record<SubjectNoDueField, boolean>>;
    }) => apiClient.patch(`/me/subject-no-due/students/${studentId}?mapping_id=${mappingId}`, patch),
    onSuccess: (_data, variables) =>
      queryClient.invalidateQueries({ queryKey: ["me", "subject-no-due", "students", variables.mappingId] }),
  });
}
