import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface StudentListItem {
  id: number;
  register_no: string;
  name: string | null;
  department: { id: number; code: string; name: string } | null;
  programme: string | null;
  semester: number | null;
  section: string | null;
}

export function useStudentExamRecordList(filters: { department_id?: number | null; semester?: number | null; search?: string }) {
  return useQuery({
    queryKey: ["coe", "student-exam-record-list", filters.department_id ?? null, filters.semester ?? null, filters.search ?? ""],
    queryFn: () =>
      apiClient.get<StudentListItem[]>("/student-exam-record", {
        department_id: filters.department_id ?? undefined,
        semester: filters.semester ?? undefined,
        search: filters.search || undefined,
      }),
  });
}

export interface StudentRecordCourse {
  subject_code: string;
  subject_name: string;
  attendance_pct: number | null;
  internal_marks: number | null;
  internal_max: number | null;
  eligibility: "eligible" | "condonation" | "detained";
}

export interface StudentStandingArrear {
  subject_code: string;
  subject_name: string;
  standing_since: string | null;
  attempts: number;
}

export interface StudentFeeDue {
  label: string;
  amount: number;
  status: "paid" | "unpaid";
}

export interface StudentCertificate {
  id: number;
  type_name: string;
  requested_at: string;
  issued_at: string | null;
  status: string;
}

export interface StudentExamRecord {
  student: {
    id: number;
    register_no: string;
    name: string | null;
    department: { id: number; code: string; name: string } | null;
    programme: string | null;
    year: number | null;
    semester: number | null;
    section: string | null;
    regulation_code: string | null;
    status: string;
  };
  stats: {
    cgpa: number | null;
    credits_earned: number;
    credits_total: number;
    arrears_count: number;
    attendance_pct: number | null;
    attendance_hold: boolean;
  };
  currentRegistration: { exam_label: string; courses: StudentRecordCourse[] } | null;
  standingArrears: StudentStandingArrear[];
  feesAndDues: StudentFeeDue[];
  certificates: StudentCertificate[];
  semesterHistory: { semester: number; gpa: number | null }[];
}

export function useStudentExamRecord(studentId: number | null) {
  return useQuery({
    queryKey: ["coe", "student-exam-record", studentId],
    queryFn: () => apiClient.get<StudentExamRecord>(`/student-exam-record/${studentId}`),
    enabled: studentId != null,
  });
}
