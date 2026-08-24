import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { ApiError } from "@/types/api";
import type { Paginated, ExamSessionCode } from "@/modules/coe/api/shared";

// src/modules/exams/malpractice/malpractice.controller.ts (base
// /malpractice-incidents) — new module, coe-only, paginated. Built against
// the malpractice_incidents table that already existed in the database
// (confirmed via a read-only `prisma db pull`) — no schema/migration change
// was needed.

export type MalpracticeNature =
  | "unauthorised_material"
  | "copying"
  | "mobile_device"
  | "impersonation"
  | "misbehaviour_with_invigilator"
  | "answer_script_tampering";

export type MalpracticeAction =
  | "reported_to_coe"
  | "warning_issued"
  | "paper_cancelled"
  | "semester_cancelled"
  | "debarred_one_year"
  | "case_under_enquiry";

export interface MalpracticeIncident {
  id: number;
  student_id: number;
  exam_id: number;
  exam_subject_mapping_id: number | null;
  venue_id: number | null;
  incident_date: string;
  session: ExamSessionCode;
  seat_number: string | null;
  nature: MalpracticeNature;
  action_taken: MalpracticeAction;
  invigilator_remarks: string | null;
  reported_by_faculty_id: number | null;
  recorded_by_user_id: number | null;
  created_at: string;
  students: { id: number; student_id_no: string; roll_no: string | null; register_no: string | null };
  faculty: { id: number; first_name: string; last_name: string; designation: string | null } | null;
  venues: { id: number; name: string; location: string | null } | null;
  exam_subject_mapping: {
    id: number;
    exam_id: number;
    subject_id: number;
    class_id: number;
    subjects: { id: number; name: string; subject_code: string };
    classes: { current_semester: number | null; departments: { id: number; code: string; name: string } };
  } | null;
  exams: { id: number; academic_year: string; semester: number };
}

export function useMalpracticeIncidents(examId?: number | null) {
  return useQuery({
    queryKey: ["coe", "malpractice-incidents", examId],
    queryFn: () =>
      apiClient.get<Paginated<MalpracticeIncident>>("/malpractice-incidents", {
        exam_id: examId ?? undefined,
        limit: 100,
      }),
  });
}

export interface CreateMalpracticeInput {
  student_id: number;
  exam_id: number;
  exam_subject_mapping_id?: number;
  venue_id?: number;
  incident_date: string;
  session: ExamSessionCode;
  seat_number?: string;
  nature: MalpracticeNature;
  action_taken: MalpracticeAction;
  invigilator_remarks?: string;
  reported_by_faculty_id?: number;
}

export function useCreateMalpracticeIncident() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMalpracticeInput) =>
      apiClient.post<MalpracticeIncident>("/malpractice-incidents", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["coe", "malpractice-incidents"] }),
  });
}

export interface StudentLookupResult {
  id: number;
  register_no: string;
  name: string | null;
  department_code: string | null;
  semester: number | null;
}

export function useLookupStudentByRegisterNo() {
  return useMutation({
    mutationFn: (registerNo: string) => apiClient.get<StudentLookupResult>("/malpractice-incidents/lookup-student", { register_no: registerNo }),
  });
}

export function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.statusCode === 404;
}

export const MALPRACTICE_NATURE_OPTIONS: { value: MalpracticeNature; label: string }[] = [
  { value: "unauthorised_material", label: "Unauthorised material" },
  { value: "copying", label: "Copying from another candidate" },
  { value: "mobile_device", label: "Use of mobile/electronic device" },
  { value: "impersonation", label: "Impersonation" },
  { value: "misbehaviour_with_invigilator", label: "Misbehaviour with invigilator" },
  { value: "answer_script_tampering", label: "Answer script tampering" },
];

export const MALPRACTICE_ACTION_OPTIONS: { value: MalpracticeAction; label: string }[] = [
  { value: "reported_to_coe", label: "Reported to the COE" },
  { value: "warning_issued", label: "Warning issued" },
  { value: "paper_cancelled", label: "Paper cancelled" },
  { value: "semester_cancelled", label: "Semester cancelled" },
  { value: "debarred_one_year", label: "Debarred for one year" },
  { value: "case_under_enquiry", label: "Case under enquiry" },
];
