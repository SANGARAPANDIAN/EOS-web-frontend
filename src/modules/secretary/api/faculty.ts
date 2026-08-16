import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// Backend reference: EOSbackend1/src/modules/faculty/{faculty,
// faculty-attendance}/*.{controller,service}.ts — real modules, Secretary
// added to `GET /me/faculty` and `GET /me/faculty/attendance/overview`
// (both institution-wide reads, same posture as the other Secretary-
// granted principal-* endpoints).
//
// KNOWN GAPS (not faked, confirmed no backend source exists for any of
// these): "load" (teaching hours/week), "duties" (count), "mentees"
// (count), a rich Available/On-duty/On-leave/Overloaded status (the real
// `faculty.status` column is only active/inactive — an account-enabled
// flag, not a live availability state), and any "assign duty" write
// action. All dropped from the Faculty Coordination screen rather than
// invented — see that page's own header comment for the full accounting.

export interface FacultyDirectoryRow {
  id: number;
  first_name: string;
  last_name: string;
  designation: string;
  department: { id: number; name: string; code: string } | null;
  date_of_joining: string;
  status: "active" | "inactive";
  profile_url: string | null;
  email: string;
  phone: string | null;
}
export interface FacultyDirectoryResponse {
  data: FacultyDirectoryRow[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

/** GET /me/faculty?department_id=&search= */
export function useFacultyDirectory(params: { department_id?: number; search?: string } = {}) {
  const qs = new URLSearchParams();
  if (params.department_id !== undefined) qs.set("department_id", String(params.department_id));
  if (params.search) qs.set("search", params.search);
  qs.set("limit", "100");
  return useQuery({
    queryKey: ["secretary", "faculty-directory", params],
    queryFn: () => apiClient.get<FacultyDirectoryResponse>(`/me/faculty?${qs.toString()}`),
  });
}

export interface FacultyAttendanceRow {
  faculty_id: number;
  first_name: string;
  last_name: string;
  profile_url: string | null;
  department: { id: number; name: string; code: string } | null;
  full_days: number;
  half_days: number;
  absent: number;
  on_duty_or_leave: number;
  attendance_percentage: number;
}
export interface FacultyAttendanceOverview {
  today: { full_days: number; half_days: number; absent: number; on_duty_or_leave: number; attendance_percentage: number };
  rows: FacultyAttendanceRow[];
}

/** GET /me/faculty/attendance/overview?department_id= */
export function useFacultyAttendanceOverview(departmentId: number | undefined) {
  const qs = departmentId !== undefined ? `?department_id=${departmentId}` : "";
  return useQuery({
    queryKey: ["secretary", "faculty-attendance-overview", departmentId],
    queryFn: () => apiClient.get<FacultyAttendanceOverview>(`/me/faculty/attendance/overview${qs}`),
  });
}
