import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { ApiError } from "@/types/api";

// src/modules/exams/marks/marks.controller.ts (base /exam-marks) — coe now
// has real access: read (GET) and the two write routes used for manual
// entry (POST/PATCH). DELETE stays FACULTY-only, unused here.

export interface ExamMark {
  id: number;
  exam_subject_mapping_id: number;
  student_id: number;
  marks_obtained: number | null;
  max_marks: number;
  entered_by_faculty_id: number | null;
  entered_at: string;
  is_absent: boolean;
  is_moderated: boolean;
  exam_subject_mapping: {
    id: number;
    exam_id: number;
    subject_id: number;
    exams: { id: number; academic_year: string; semester: number; exam_types: { name: string } };
    subjects: { id: number; name: string; subject_code: string };
  };
  students: Record<string, unknown>;
  faculty: Record<string, unknown> | null;
}

export function useExamMarks(studentId?: number | null) {
  return useQuery({
    queryKey: ["coe", "exam-marks", studentId],
    queryFn: () => apiClient.get<ExamMark[]>("/exam-marks", { student_id: studentId ?? undefined }),
    retry: false,
  });
}

export interface CreateMarkInput {
  exam_subject_mapping_id: number;
  student_id: number;
  marks_obtained?: number;
  max_marks: number;
  entered_by_faculty_id?: number;
}

export function useCreateExamMark() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMarkInput) => apiClient.post<ExamMark>("/exam-marks", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coe", "exam-marks"] });
      queryClient.invalidateQueries({ queryKey: ["coe", "marks-roster"] });
    },
  });
}

export interface UpdateMarkInput {
  id: number;
  marks_obtained?: number;
  max_marks?: number;
}

export function useUpdateExamMark() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateMarkInput) => apiClient.patch<ExamMark>(`/exam-marks/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coe", "exam-marks"] });
      queryClient.invalidateQueries({ queryKey: ["coe", "marks-roster"] });
    },
  });
}

export function isForbidden(error: unknown): boolean {
  return error instanceof ApiError && error.statusCode === 403;
}
