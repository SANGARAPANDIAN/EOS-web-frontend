import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// src/modules/exams/exams/exams.controller.ts + exam-subject-mapping —
// confirmed field names against the real DTOs/services, not docs/api/05-exams.md.

export type ExamStatus = "created" | "timetable_published" | "completed" | "results_published";
export type ExamCategory = "regular" | "arrear" | "supplementary";

export interface Exam {
  id: number;
  exam_type_id: number;
  batch_id: number;
  academic_year: string;
  semester: number;
  status: ExamStatus;
  created_by_user_id: number | null;
  created_at: string;
  start_date: string | null;
  end_date: string | null;
  title: string | null;
  exam_category: ExamCategory | null;
  registration_opens_at: string | null;
  registration_closes_at: string | null;
  /** Columns added via query.md ALTER — undefined/null until that migration is applied; render as "—" until then. */
  fee_amount?: number | null;
  notes_to_students?: string | null;
}

export function useExams() {
  return useQuery({
    queryKey: ["coe", "exams"],
    queryFn: () => apiClient.get<Exam[]>("/exams"),
  });
}

export interface CreateExamInput {
  title?: string;
  exam_type_id: number;
  batch_id: number;
  academic_year: string;
  semester: number;
  exam_category?: ExamCategory;
  registration_opens_at?: string;
  registration_closes_at?: string;
  fee_amount?: number;
  notes_to_students?: string;
}

export interface CreateExamResult {
  id: number;
  exam_type: string;
  batch_id: number;
  semester: number;
  status: ExamStatus;
  subject_mappings_created: number;
}

/** POST /exams — coe only. Bulk-creates one exam_subject_mapping row per subject already assigned to every class in this batch/semester, so a fresh exam usually arrives with mappings already in place. */
export function useCreateExam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateExamInput) => apiClient.post<CreateExamResult>("/exams", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coe", "exams"] });
      queryClient.invalidateQueries({ queryKey: ["coe", "exam-subject-mapping"] });
    },
  });
}

export interface UpdateExamInput {
  title?: string;
  exam_type_id?: number;
  batch_id?: number;
  academic_year?: string;
  semester?: number;
  exam_category?: ExamCategory;
  registration_opens_at?: string;
  registration_closes_at?: string;
  fee_amount?: number;
  notes_to_students?: string;
}

/** PATCH /exams/:id — no @Roles guard on the real controller today, but every other exams write is coe-only so this UI is coe-only too. */
export function useUpdateExam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateExamInput }) => apiClient.patch<Exam>(`/exams/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["coe", "exams"] }),
  });
}

export interface ExamSubjectMapping {
  id: number;
  exam_id: number;
  class_id: number;
  subject_id: number;
  is_published: boolean;
  published_at: string | null;
  is_elective: boolean;
}

/** GET /exam-subject-mapping takes no query filters at all — every consumer must fetch the full table and filter client-side. */
export function useExamSubjectMappings() {
  return useQuery({
    queryKey: ["coe", "exam-subject-mapping"],
    queryFn: () => apiClient.get<ExamSubjectMapping[]>("/exam-subject-mapping"),
  });
}

export interface CreateExamSubjectMappingInput {
  exam_id: number;
  class_id: number;
}

export function useCreateExamSubjectMapping() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateExamSubjectMappingInput) =>
      apiClient.post<{ exam_id: number; class_id: number; total_subjects: number }>("/exam-subject-mapping", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["coe", "exam-subject-mapping"] }),
  });
}
