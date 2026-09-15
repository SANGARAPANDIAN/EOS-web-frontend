import { useQuery } from "@tanstack/react-query";
import { apiClient, type QueryParams } from "@/lib/api/client";
import { getToken } from "@/lib/auth/session";
import { ApiError } from "@/types/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api/v1";

export interface FacultyFilters {
  departments: { id: number; name: string; code: string }[];
}

/** GET /me/principal/faculty/filters — real departments only. */
export function useFacultyFilters() {
  return useQuery({
    queryKey: ["me", "principal", "faculty", "filters"],
    queryFn: () => apiClient.get<FacultyFilters>("/me/principal/faculty/filters"),
  });
}

export interface FacultySummary {
  teaching_total: number;
  non_teaching_total: number;
  on_duty: { reported_today: number; on_leave_today: number; total_active: number };
  leave_requests_pending: number;
  appraisals: { closed: number; total: number };
  payroll: { month_label: string; processed_count: number; total_count: number; processed_amount: number };
}

/** GET /me/principal/faculty/summary — institution-wide tiles. */
export function useFacultySummary() {
  return useQuery({
    queryKey: ["me", "principal", "faculty", "summary"],
    queryFn: () => apiClient.get<FacultySummary>("/me/principal/faculty/summary"),
  });
}

export interface FacultyDepartmentStrengthRow {
  department: { id: number; name: string; code: string };
  teaching: number;
  support: number;
  avg_workload_hours: number | null;
  attendance_percentage: number | null;
}

/** GET /me/principal/faculty/department-strength */
export function useFacultyDepartmentStrength() {
  return useQuery({
    queryKey: ["me", "principal", "faculty", "department-strength"],
    queryFn: () =>
      apiClient.get<{ departments: FacultyDepartmentStrengthRow[]; support_unassigned: number }>(
        "/me/principal/faculty/department-strength",
      ),
  });
}

export interface FacultyRow {
  id: number;
  name: string;
  designation: string;
  department: { id: number; name: string; code: string } | null;
  qualification: string | null;
  experience_years: number | null;
  classes_count: number;
  attendance_percentage: number | null;
  email: string;
  phone: string | null;
}

export interface FacultyListParams {
  q?: string;
  department_id?: number;
  page?: number;
  limit?: number;
}

export interface FacultyListResponse {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  faculty: FacultyRow[];
}

/**
 * GET /me/principal/faculty — every active faculty member matching the
 * given filters, ordered department-wise (department name, then faculty
 * name) and paginated 15 at a time.
 */
export function useFacultyList(params: FacultyListParams) {
  return useQuery({
    queryKey: ["me", "principal", "faculty", "list", params],
    queryFn: () => apiClient.get<FacultyListResponse>("/me/principal/faculty", params as QueryParams),
  });
}

// --- Full Faculty Profile detail screen ---
// Backed by GET /principal-faculty/:id/profile (see
// EOSbackend1/src/modules/principal-faculty/principal-faculty.service.ts)
// — the same institution-wide, schema-audited endpoint the Secretary
// module's faculty profile screen already uses, now also granted to
// Principal. Publications/citations, faculty-level awards, and
// committee-membership responsibilities are real but sparsely populated —
// an empty array means genuinely none on file, not a fetch failure.

export interface FacultyProfile {
  id: number;
  staff_code: string | null;
  name: string;
  designation: string;
  department: { id: number; name: string; code: string } | null;
  photo_url: string | null;
  date_of_joining: string | null;
  experience_years: number | null;
  status: string;
  gender: string | null;
  date_of_birth: string | null;
  institute_email: string;
  personal_email: string | null;
  phone: string | null;
  qualification: string | null;
  specialization: string | null;
  previous_institution: string | null;
  office_room: string | null;
  work_location: string | null;
  employment_status: string | null;
  employment_type: string | null;
  attendance_pct_this_term: number | null;
  periods_per_week: number;
  class_advisor_of: string | null;
  subjects_handled: { code: string; name: string; semester: number | null; section: string; academic_year: string }[];
  leave_balances: { leave_type: string; allocated: number; used: number; academic_year: string }[];
  leave_history: { from_date: string; to_date: string; reason: string | null; hod_status: string; hr_status: string; created_at: string }[];
  od_history: { from_date: string; to_date: string; purpose: string | null; place: string | null; hod_status: string; hr_status: string }[];
  appraisal: { status: string; academic_year: string; hod_reviewed_at: string | null; management_approved_at: string | null; remarks: string | null } | null;
  publications: { title: string; type: string; year: number; citation_count: number }[];
  publications_summary: { total: number; journals: number; conferences: number; books: number; total_citations: number; h_index: number };
  awards: { title: string; year: number; awarded_by: string | null }[];
  responsibilities: { title: string; academic_year: string }[];
}

export function useFacultyProfile(id: number | undefined) {
  return useQuery({
    queryKey: ["me", "principal", "faculty", "profile", id],
    queryFn: () => apiClient.get<FacultyProfile>(`/principal-faculty/${id}/profile`),
    enabled: id !== undefined,
  });
}

/**
 * GET /principal-faculty/:id/profile/export?format=csv|excel|pdf returns a
 * raw file buffer (not the JSON envelope apiClient expects), and a plain
 * <a href> download wouldn't carry the Bearer token — same
 * fetch-as-blob-then-object-URL pattern as
 * principal/api/students.ts's downloadStudentProfile().
 */
export async function downloadFacultyProfile(id: number, format: "csv" | "excel" | "pdf"): Promise<void> {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}/principal-faculty/${id}/profile/export?format=${format}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(
      body ?? {
        success: false,
        statusCode: res.status,
        errorCode: "UNKNOWN_ERROR",
        message: "Could not download the faculty profile.",
        timestamp: new Date().toISOString(),
        path: "",
      },
    );
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `faculty-profile.${format === "excel" ? "xlsx" : format}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
