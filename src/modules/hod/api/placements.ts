import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface HodPlacementStudentRow {
  student_id: number;
  student_id_no: string;
  name: string | null;
  class_label: string | null;
  company: string | null;
  package_lpa: number | null;
  offers: number;
  status: "placed" | "in_process" | "unplaced";
}

export interface HodPlacementEligibleClass {
  class_id: number;
  section: string;
  semester: number;
  year_label: string;
  class_label: string;
}

export interface HodPlacementStudents {
  department: { id: number; name: string; code: string };
  classes: HodPlacementEligibleClass[];
  selected_class_id: number | null;
  counts: { placed: number; in_process: number; unplaced: number };
  rows: HodPlacementStudentRow[];
}

/** GET /hod/placements/students?search=&class_id= */
export function useHodPlacementStudents(search: string, classId: number | null) {
  return useQuery({
    queryKey: ["hod", "placements", "students", search, classId],
    queryFn: () =>
      apiClient.get<HodPlacementStudents>("/hod/placements/students", {
        search: search || undefined,
        class_id: classId ?? undefined,
      }),
  });
}

export interface HodPlacementDrive {
  id: number;
  company_name: string;
  job_role: string | null;
  package_lpa: number | null;
  eligibility_cgpa: number | null;
  scheduled_date: string;
  registration_start: string | null;
  registration_end: string | null;
  status: string;
}

/** GET /hod/placements/drives */
export function useHodUpcomingDrives() {
  return useQuery({
    queryKey: ["hod", "placements", "drives"],
    queryFn: () => apiClient.get<HodPlacementDrive[]>("/hod/placements/drives"),
  });
}

export interface HodPlacementHistoryRow {
  batch_id: number;
  batch_label: string;
  eligible_count: number;
  placed_count: number;
  placement_percent: number;
  average_package_lpa: number | null;
  top_recruiter: { name: string; offers: number } | null;
}

/** GET /hod/placements/history */
export function useHodPlacementHistory() {
  return useQuery({
    queryKey: ["hod", "placements", "history"],
    queryFn: () =>
      apiClient.get<{ department: { code: string }; rows: HodPlacementHistoryRow[] }>(
        "/hod/placements/history",
      ),
  });
}

export interface HodStudentProfileApplication {
  drive_id: number;
  company_name: string;
  job_role: string | null;
  status: "applied" | "r1_cleared" | "r2_cleared" | "r3_cleared" | "rejected" | "placed";
  updated_at: string;
}

export interface HodStudentProfileOffer {
  drive_id: number;
  company_name: string;
  job_role: string | null;
  offered_package: number | null;
  offer_response: "accepted" | "declined" | null;
  updated_at: string;
}

export interface HodStudentProfile {
  id: number;
  student_id_no: string;
  register_no: string | null;
  name: string;
  email: string;
  department_name: string | null;
  department_code: string | null;
  year: number | null;
  photo_url: string | null;
  resume_url: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  leetcode_url: string | null;
  hackerrank_url: string | null;
  codeforces_url: string | null;
  drives_applied: number;
  offers_count: number;
  status: HodStudentProfileApplication["status"] | null;
  applications: HodStudentProfileApplication[];
  offers: HodStudentProfileOffer[];
}

/**
 * GET /me/department-students/:studentId/profile — same HoD-scoped
 * endpoint MeDrivesController exposes (student's class must belong to the
 * HoD's own department), backed by the exact shared getStudentProfile()
 * the Placement Cell's own student detail page (StudentDetailContent)
 * already uses. Reused as-is here rather than building a near-duplicate
 * profile endpoint.
 */
export function useHodStudentProfile(studentId: number | null) {
  return useQuery({
    queryKey: ["hod", "department-students", studentId, "profile"],
    queryFn: () =>
      apiClient.get<HodStudentProfile>(`/me/department-students/${studentId}/profile`),
    enabled: studentId !== null,
  });
}
