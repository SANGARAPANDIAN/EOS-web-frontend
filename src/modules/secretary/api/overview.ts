import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// Backend reference: EOSbackend1/src/modules/principal-{students,faculty,
// exams,placements}/*.{controller,service}.ts — institution-wide aggregate
// endpoints originally Principal-only, now also granted to Secretary (same
// institution-wide posture as /announcements — no secretary→department
// table exists anywhere in the schema, confirmed by direct schema grep).
// Every field below was read directly off the real service `return {...}`
// shape, not guessed from a summary.

export interface StudentAttendanceOverview {
  present_today: number;
  mean_attendance_pct: number | null;
  below_75_count: number;
  departments: { code: string; name: string; attendance_pct: number | null }[];
}

/** GET /principal-students/attendance-overview */
export function useStudentAttendanceOverview() {
  return useQuery({
    queryKey: ["secretary", "overview", "student-attendance"],
    queryFn: () => apiClient.get<StudentAttendanceOverview>("/principal-students/attendance-overview"),
  });
}

/** GET /principal-students/roll-count — institution-wide, unfiltered (no
 * department_id param exists on this route). */
export function useRollCount() {
  return useQuery({
    queryKey: ["secretary", "overview", "roll-count"],
    queryFn: () => apiClient.get<{ count: number }>("/principal-students/roll-count"),
  });
}

export interface FacultyOverview {
  total_employees: number;
  teaching_count: number;
  non_teaching_count: number;
  present_today: number;
  on_duty_today: number;
  on_leave_today: number;
  appraisals_closed: number;
  appraisals_total: number;
  appraisal_academic_year: string | null;
  payroll_amount: number;
  payroll_month: number;
  payroll_year: number;
  payroll_disbursed_at: string | null;
  departments: { code: string; name: string; teaching: number; support: number; attendance_pct: number | null }[];
}

/** GET /principal-faculty/overview */
export function useFacultyOverview() {
  return useQuery({
    queryKey: ["secretary", "overview", "faculty"],
    queryFn: () => apiClient.get<FacultyOverview>("/principal-faculty/overview"),
  });
}

export interface ExamsOverview {
  pass_percentage: number | null;
  pass_percentage_delta: number | null;
  current_semester: number | null;
  students_with_arrears: number;
  arrear_papers: number;
  high_cgpa_count: number;
  high_cgpa_pct: number | null;
  revaluation_total: number;
  revaluation_pending: number;
  departments: { code: string; name: string; pass_pct: number | null; arrear_papers: number; topper_cgpa: number | null }[];
}

/** GET /principal-exams/overview — no raw "average CGPA" field exists here
 * (see StudentRow.cgpa via useStudentsSearch for per-student values used to
 * build the CGPA-distribution bands client-side from real records). */
export function useExamsOverview() {
  return useQuery({
    queryKey: ["secretary", "overview", "exams"],
    queryFn: () => apiClient.get<ExamsOverview>("/principal-exams/overview"),
  });
}

export interface PlacementsOverview {
  season_year: number;
  companies: number;
  offers_released: number;
  placement_pct: number | null;
  placement_pct_delta: number | null;
  highest_package: number | null; // LPA, `placement_offers.package_lpa` is already stored in LPA
  highest_package_role: string | null;
  average_package: number | null; // LPA
  students_placed: number;
  applicants: number;
  departments: { code: string; name: string; placement_pct: number | null }[];
}

/** GET /principal-placements/overview */
export function usePlacementsOverview() {
  return useQuery({
    queryKey: ["secretary", "overview", "placements"],
    queryFn: () => apiClient.get<PlacementsOverview>("/principal-placements/overview"),
  });
}

export interface FacultyListRow {
  id: number;
  first_name: string;
  last_name: string;
  designation: string;
  department: { id: number; name: string; code: string } | null;
  date_of_joining: string;
  status: string;
  profile_url: string | null;
  email: string;
  phone: string | null;
}
export interface FacultyListResponse {
  data: FacultyListRow[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

/** GET /me/faculty?department_id=&limit= — real name/designation/department
 * list for the Reports "faculty summary" table. There is NO "load" (weekly
 * teaching hours), "result %", or "publications" field anywhere in the
 * schema for any faculty member — those 3 design columns have no real
 * backend source and are NOT faked here (see reports/page.tsx). */
export function useFacultyList(params: { limit?: number } = {}) {
  const qs = new URLSearchParams();
  qs.set("limit", String(params.limit ?? 100));
  return useQuery({
    queryKey: ["secretary", "overview", "faculty-list", params],
    queryFn: () => apiClient.get<FacultyListResponse>(`/me/faculty?${qs.toString()}`),
  });
}

export interface FacultyAttendanceStats {
  full_days: number;
  half_days: number;
  absent: number;
  on_duty_or_leave: number;
  attendance_percentage: number;
}
export interface FacultyAttendanceRow extends FacultyAttendanceStats {
  faculty_id: number;
  first_name: string;
  last_name: string;
  profile_url: string | null;
  department: { id: number; name: string; code: string } | null;
}
export interface FacultyAttendanceOverview {
  today: FacultyAttendanceStats;
  rows: FacultyAttendanceRow[];
}

/** GET /me/faculty/attendance/overview — real per-faculty attendance %,
 * joined client-side onto useFacultyList() by faculty_id for the Reports
 * "faculty summary" table's Attendance column. */
export function useFacultyAttendanceOverview() {
  return useQuery({
    queryKey: ["secretary", "overview", "faculty-attendance"],
    queryFn: () => apiClient.get<FacultyAttendanceOverview>("/me/faculty/attendance/overview"),
  });
}

export interface DepartmentOverviewRow {
  id: number;
  code: string;
  name: string;
  established_at: string;
  courses_offered: number;
  courses: { id: number; name: string; code: string; duration_years: number }[];
  hod_name: string | null;
  students: number;
  faculty: number;
  attendance_pct: number | null;
  placement_pct: number | null;
  placement_applicants: number;
}
export interface DepartmentsOverview {
  total_departments: number;
  departments: DepartmentOverviewRow[];
}

/** GET /principal-departments/overview — real per-department strength,
 * HoD, established date, courses offered, attendance and placement %. */
export function useDepartmentsOverview() {
  return useQuery({
    queryKey: ["secretary", "overview", "departments"],
    queryFn: () => apiClient.get<DepartmentsOverview>("/principal-departments/overview"),
  });
}

export interface StudentRow {
  id: number;
  student_id_no: string;
  register_no: string;
  name: string;
  department_code: string;
  department_name: string;
  semester: number | null;
  class_id: number | null;
  section: string | null;
  attendance_pct: number | null;
  cgpa: number | null;
  fee_status: "paid" | "due" | "scholarship" | "no_demand";
  fee_outstanding: number;
}
export interface StudentsSearchResponse {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  students: StudentRow[];
}

/** GET /principal-students?search=&department_id=&year=&below_75=&fees_pending=&limit=&page=
 * `limit` is capped at 100 server-side. There is no "section" field on this
 * row shape (only department + semester) and no per-student arrears count
 * — both flagged as real gaps in the Reports screen, not faked. */
export function useStudentsSearch(params: { search?: string; department_id?: number; class_id?: number; below_75?: boolean; limit?: number; page?: number } = {}) {
  const qs = new URLSearchParams();
  if (params.search) qs.set("search", params.search);
  if (params.department_id !== undefined) qs.set("department_id", String(params.department_id));
  if (params.class_id !== undefined) qs.set("class_id", String(params.class_id));
  if (params.below_75 !== undefined) qs.set("below_75", String(params.below_75));
  qs.set("limit", String(params.limit ?? 100));
  qs.set("page", String(params.page ?? 1));
  return useQuery({
    queryKey: ["secretary", "overview", "students-search", params],
    queryFn: () => apiClient.get<StudentsSearchResponse>(`/principal-students?${qs.toString()}`),
  });
}
