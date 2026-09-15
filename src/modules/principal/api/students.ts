import { useQuery } from "@tanstack/react-query";
import { apiClient, type QueryParams } from "@/lib/api/client";
import { getToken } from "@/lib/auth/session";
import { ApiError } from "@/types/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api/v1";

export interface StudentFilters {
  batches: { id: number; name: string }[];
  departments: { id: number; name: string; code: string }[];
  sections: string[];
}

/** GET /me/principal/students/filters — real dropdown options, straight from batches/departments/classes. */
export function useStudentFilters() {
  return useQuery({
    queryKey: ["me", "principal", "students", "filters"],
    queryFn: () => apiClient.get<StudentFilters>("/me/principal/students/filters"),
  });
}

export interface StudentsSummary {
  on_roll: number;
  present_today: number;
  absent_today: number;
  attendance_percentage_today: number | null;
  students_below_threshold: number;
  fees: { students_pending: number; total_outstanding: number };
  placement: { placed: number; registered: number };
}

/** GET /me/principal/students/summary — institution-wide tiles. No CGPA/arrears figure: neither is trackable in this schema. */
export function useStudentsSummary() {
  return useQuery({
    queryKey: ["me", "principal", "students", "summary"],
    queryFn: () => apiClient.get<StudentsSummary>("/me/principal/students/summary"),
  });
}

export type StudentFeesStatus = "paid" | "partial" | "pending" | "not_billed";
export type StudentPlacementStatus = "placed" | "applied" | "not_registered";

export interface StudentRow {
  id: number;
  name: string;
  student_id_no: string;
  roll_no: string | null;
  register_no: string | null;
  batch: { id: number; name: string; start_year: number } | null;
  department: { id: number; name: string; code: string } | null;
  section: string | null;
  semester: number | null;
  attendance_percentage: number | null;
  fees_status: StudentFeesStatus;
  placement_status: StudentPlacementStatus;
  /** Credit-weighted, computed live from published exam_marks — null when the student has no graded results yet. */
  cgpa: number | null;
  /** null (not just false) when there's no graded result to derive it from. */
  has_arrears: boolean | null;
}

export type StudentsFilterPreset =
  | "all"
  | "attendance_below_75"
  | "fees_pending"
  | "cgpa_above_85"
  | "cgpa_below_7"
  | "has_arrears";

export interface StudentsListParams {
  q?: string;
  batch_id?: number;
  department_id?: number;
  section?: string;
  filter?: StudentsFilterPreset;
  page?: number;
  limit?: number;
}

export interface StudentsListResponse {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  students: StudentRow[];
}

/**
 * GET /me/principal/students — every active student matching the given
 * filters, with attendance/fees/placement/CGPA bulk-computed server-side,
 * ordered batch-wise (current 1st years first, then department, section,
 * roll number) and paginated 15 at a time.
 */
export function useStudentsList(params: StudentsListParams) {
  return useQuery({
    queryKey: ["me", "principal", "students", "list", params],
    queryFn: () => apiClient.get<StudentsListResponse>("/me/principal/students", params as QueryParams),
  });
}

// --- Full Student Profile detail screen ---
// Backed by GET /principal-students/:id/profile (see
// EOSbackend1/src/modules/principal-students/principal-students.service.ts)
// — the same institution-wide, schema-audited endpoint the Secretary
// module's student profile screen already uses, now also granted to
// Principal. Every field here maps to a real table; a section with no
// matching row renders a genuine empty state, not fabricated content.

export interface StudentProfile {
  id: number;
  name: string;
  student_id_no: string;
  roll_no: string | null;
  register_no: string | null;
  status: string;
  admission_no: string | null;
  admission_date: string | null;
  admission_type: string | null;
  admission_quota: string | null;
  department: { id: number; name: string; code: string } | null;
  programme: string | null;
  batch: string | null;
  section: string | null;
  semester: number | null;
  gender: string | null;
  date_of_birth: string | null;
  blood_group: string | null;
  mother_tongue: string | null;
  community: string | null;
  nationality: string | null;
  religion: string | null;
  caste: string | null;
  is_first_graduate: boolean;
  is_diff_abled: boolean;
  diff_abled_info: string | null;
  photo_url: string | null;
  institute_email: string;
  personal_email: string | null;
  alternate_email: string | null;
  mobile: string | null;
  aadhar_number: string | null;
  pan_number: string | null;
  passport_number: string | null;
  addresses: { type: string; line: string | null; city: string | null; state: string | null; pincode: string | null; district: string | null }[];
  class_advisor: string | null;
  faculty_mentor: string | null;
  identity_marks: { number: number; description: string | null }[];
  family: {
    father: { name: string | null; qualification: string | null; occupation: string | null; annual_income: number | null; email: string | null; mobile: string | null; photo_url: string | null };
    mother: { name: string | null; qualification: string | null; occupation: string | null; annual_income: number | null; email: string | null; mobile: string | null; photo_url: string | null };
    guardian: { name: string | null; relationship: string | null; is_father: boolean; mobile: string | null; email: string | null };
  } | null;
  pre_admission: { cutoff_physics: string | null; cutoff_chemistry: string | null; cutoff_maths: string | null } | null;
  gpa_history: { semester: number; gpa: number | null; credits: number; arrears: number }[];
  overall_gpa: number | null;
  overall_percentage: number | null;
  current_semester_subjects: { name: string; code: string; internal: number | null; external: number | null; total: number; grade: string }[];
  monthly_attendance: { month: string; pct: number }[];
  overall_attendance_pct: number | null;
  documents: { name: string; available: boolean; file_url: string | null; verified_at: string | null }[];
  scholarships: { scheme: string; amount: number; awarded_at: string }[];
  hostel: { room_id: number; allocated_date: string; room_number: string | null; block: string | null } | null;
  transport: { route_id: number } | null;
  meeting_notes: { date: string; note: string }[];
  library: { books_issued: number };
  fee_ledger: { name: string; academic_year: string; semester: number | null; total_amount: number; paid_amount: number; status: "paid" | "partial" | "pending" }[];
  fees: { total_demand: number; total_paid: number; status: "no_demand" | "paid" | "due" | "scholarship" };
  achievements: { label: string; date: string | null; source: "sports" | "test_score" }[];
  discipline: { incident_count: number };
  placement: { company: string; status: string; offer_response: string | null; offered_package: number | null }[];
}

export function useStudentProfile(id: number | undefined) {
  return useQuery({
    queryKey: ["me", "principal", "students", "profile", id],
    queryFn: () => apiClient.get<StudentProfile>(`/principal-students/${id}/profile`),
    enabled: id !== undefined,
  });
}

/**
 * GET /principal-students/:id/profile/export?format=csv|excel|pdf returns a
 * raw file buffer (not the JSON envelope apiClient expects), and a plain
 * <a href> download wouldn't carry the Bearer token — same
 * fetch-as-blob-then-object-URL pattern as
 * principal/api/reports.ts's downloadScorecard().
 */
export async function downloadStudentProfile(id: number, format: "csv" | "excel" | "pdf"): Promise<void> {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}/principal-students/${id}/profile/export?format=${format}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(
      body ?? {
        success: false,
        statusCode: res.status,
        errorCode: "UNKNOWN_ERROR",
        message: "Could not download the student profile.",
        timestamp: new Date().toISOString(),
        path: "",
      },
    );
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `student-profile.${format === "excel" ? "xlsx" : format}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
