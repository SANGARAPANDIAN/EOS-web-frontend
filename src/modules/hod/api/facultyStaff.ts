import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface HodFacultyStaffOverview {
  department: { id: number; name: string; code: string };
  employee_count: number;
  teaching_count: number;
  non_teaching_count: number;
  faculty_attendance: {
    percentage: number;
    reported: number;
    on_roll: number;
    on_leave: number;
    on_duty: number;
  };
  on_duty_today: { count: number; on_approved_leave: number };
  leave_requests_pending: number;
  appraisal: {
    closed: number;
    total: number;
    cycle_academic_year: string | null;
    cycle_end_date: string | null;
  };
}

/** GET /hod/faculty-staff/overview */
export function useHodFacultyStaffOverview() {
  return useQuery({
    queryKey: ["hod", "faculty-staff", "overview"],
    queryFn: () => apiClient.get<HodFacultyStaffOverview>("/hod/faculty-staff/overview"),
  });
}

export interface HodFacultyStaffRow {
  kind: "faculty" | "non_teaching";
  id: number;
  name: string;
  designation: string;
  department_code: string;
  photo_url: string | null;
  attendance_percent: number | null;
  load_hours: number | null;
  status_label: string | null;
}

export type HodFacultyStaffType = "all" | "teaching" | "non_teaching";

/** GET /hod/faculty-staff/list?type=&search= */
export function useHodFacultyStaffList(type: HodFacultyStaffType, search: string) {
  return useQuery({
    queryKey: ["hod", "faculty-staff", "list", type, search],
    queryFn: () =>
      apiClient.get<{ department: { code: string }; rows: HodFacultyStaffRow[] }>(
        "/hod/faculty-staff/list",
        { type, search: search || undefined },
      ),
  });
}

export interface HodFacultySubject {
  subject_id: number;
  code: string;
  name: string;
  class_id: number;
  semester: number | null;
  year_label: string | null;
  section: string;
  periods_per_week: number;
}

export interface HodFacultyLeaveBalance {
  leave_type: string;
  allocated: number;
  used: number;
}

export interface HodFacultyProfile {
  department: { id: number; name: string; code: string };
  faculty: {
    id: number;
    name: string;
    designation: string;
    qualification: string | null;
    specialization: string | null;
    photo_url: string | null;
    department_name: string;
    department_code: string;
    institute_email: string | null;
    contact_number: string | null;
    date_of_joining: string | null;
    experience_years: number | null;
  };
  attendance_this_term: number | null;
  today_status_label: string | null;
  workload: { periods_per_week: number; hours_per_week: number | null };
  advisory_class: { section: string; year_label: string | null } | null;
  subjects: HodFacultySubject[];
  leave_balances: HodFacultyLeaveBalance[];
  on_duty_days_this_term: number;
  appraisal: {
    status: string | null;
    cycle_academic_year: string | null;
    cycle_end_date: string | null;
  };
  academic_year: string;
}

/** GET /hod/faculty-staff/faculty/:id */
export function useHodFacultyProfile(id: number | null) {
  return useQuery({
    queryKey: ["hod", "faculty-staff", "faculty", id],
    queryFn: () => apiClient.get<HodFacultyProfile>(`/hod/faculty-staff/faculty/${id}`),
    enabled: id !== null,
  });
}

export interface HodNonTeachingProfile {
  department: { id: number; name: string; code: string };
  staff: {
    id: number;
    name: string;
    category: string;
    department_name: string;
    department_code: string;
    institute_email: string | null;
    contact_number: string | null;
    date_of_joining: string | null;
    status: string;
  };
}

/** GET /hod/faculty-staff/non-teaching/:id */
export function useHodNonTeachingProfile(id: number | null) {
  return useQuery({
    queryKey: ["hod", "faculty-staff", "non-teaching", id],
    queryFn: () => apiClient.get<HodNonTeachingProfile>(`/hod/faculty-staff/non-teaching/${id}`),
    enabled: id !== null,
  });
}
