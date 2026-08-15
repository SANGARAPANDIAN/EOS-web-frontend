import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface ExamsSummary {
  pass_percentage: number | null;
  failing_attempts: { count: number; students: number };
  high_scorers: { students: number; grade_label: string };
  revaluation: { total: number; pending: number };
}

/** GET /me/principal/exams/summary — real, per-exam-attempt figures (see backend doc comment for why CGPA/arrears aren't here). */
export function useExamsSummary() {
  return useQuery({
    queryKey: ["me", "principal", "exams", "summary"],
    queryFn: () => apiClient.get<ExamsSummary>("/me/principal/exams/summary"),
  });
}

export interface ExamsFilters {
  batches: { id: number; label: string }[];
  exam_types: { id: number; name: string; code: string }[];
}

export function useExamsFilters() {
  return useQuery({
    queryKey: ["me", "principal", "exams", "filters"],
    queryFn: () => apiClient.get<ExamsFilters>("/me/principal/exams/filters"),
  });
}

export interface ExamClassRow {
  id: number;
  section: string;
  current_semester: number | null;
  departments: { id: number; name: string; code: string };
}

export function useExamClasses(batchId: number | null) {
  return useQuery({
    queryKey: ["me", "principal", "exams", "classes", batchId],
    queryFn: () => apiClient.get<ExamClassRow[]>("/me/principal/exams/classes", { batch_id: batchId! }),
    enabled: batchId != null,
  });
}

export function useExamSemesters(batchId: number | null) {
  return useQuery({
    queryKey: ["me", "principal", "exams", "semesters", batchId],
    queryFn: () => apiClient.get<number[]>("/me/principal/exams/semesters", { batch_id: batchId! }),
    enabled: batchId != null,
  });
}

export interface ExamInstance {
  id: number;
  title: string;
  academic_year: string;
  semester: number;
  status: string;
  exam_types: { name: string; code: string };
}

export function useExamsForBatchSemester(batchId: number | null, semester: number | null) {
  return useQuery({
    queryKey: ["me", "principal", "exams", "exams", batchId, semester],
    queryFn: () => apiClient.get<ExamInstance[]>("/me/principal/exams/exams", { batch_id: batchId!, semester: semester! }),
    enabled: batchId != null && semester != null,
  });
}

export interface ExamResultCell {
  subject_code: string;
  entered: boolean;
  is_absent: boolean;
  marks_obtained: number | null;
  max_marks: number | null;
  percentage: number | null;
  grade: string | null;
}

export interface ExamResultRow {
  student_id_no: string;
  register_no: string | null;
  name: string;
  cells: ExamResultCell[];
  average_percentage: number | null;
}

export interface ExamResults {
  exam: { title: string; academic_year: string; semester: number } | null;
  class: { section: string; department: string; department_code: string } | null;
  subjects: { subject_code: string; name: string }[];
  candidate_count: number;
  paper_count: number;
  rows: ExamResultRow[];
}

export function useExamResults(examId: number | null, classId: number | null) {
  return useQuery({
    queryKey: ["me", "principal", "exams", "results", examId, classId],
    queryFn: () => apiClient.get<ExamResults>("/me/principal/exams/results", { exam_id: examId!, class_id: classId! }),
    enabled: examId != null && classId != null,
  });
}
