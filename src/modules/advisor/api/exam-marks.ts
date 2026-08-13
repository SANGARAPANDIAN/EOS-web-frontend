import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// Backend reference: src/modules/faculty/exam-marks/exam-marks.{controller,service}.ts

export interface ExamMarkRosterStudent {
  student_id: number;
  roll_no: string;
  name: string;
  mark_id: number | null;
  marks_obtained: number | null;
}

export interface ExamMarkRoster {
  exam_subject_mapping_id: number;
  locked: boolean;
  max_marks: number | null;
  students: ExamMarkRosterStudent[];
}

/** GET /me/exam-marks/roster/:exam_subject_mapping_id */
export function useExamMarkRoster(mappingId: number | undefined) {
  return useQuery({
    queryKey: ["me", "exam-marks", "roster", mappingId],
    queryFn: () => apiClient.get<ExamMarkRoster>(`/me/exam-marks/roster/${mappingId}`),
    enabled: Boolean(mappingId),
  });
}

export interface EnterExamMarksInput {
  mappingId: number;
  max_marks: number;
  entries: { student_id: number; marks_obtained: number }[];
}

/** POST /me/exams/:exam_subject_mapping_id/marks */
export function useEnterExamMarks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ mappingId, ...body }: EnterExamMarksInput) =>
      apiClient.post<{ exam_subject_mapping_id: number; entered: number; skipped_already_entered: number }>(`/me/exams/${mappingId}/marks`, body),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["me", "exam-marks", "roster", vars.mappingId] });
      queryClient.invalidateQueries({ queryKey: ["me", "subject-records"] });
    },
  });
}

/** PATCH /me/exam-marks/:id */
export function useUpdateExamMark() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, marks_obtained }: { id: number; marks_obtained: number }) => apiClient.patch(`/me/exam-marks/${id}`, { marks_obtained }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me", "exam-marks"] }),
  });
}
