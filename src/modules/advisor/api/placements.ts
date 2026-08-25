import { useQueries, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// Backend reference: src/modules/placement/drives/{drives.service,me-drives.controller}.ts
// Exact shapes confirmed by reading DrivesService directly.

export interface UpcomingDrive {
  drive_id: number;
  company_name: string; // "Company undisclosed" when is_disclosed is false — resolved server-side
  company_profile_info: string | null;
  scheduled_date: string;
  is_disclosed: boolean;
  disclosed_reveal_date: string | null;
  // Real columns on placement_drives — DrivesService.getUpcomingDrivesForFaculty()
  // always includes these keys (job_role/venue/eligibility_cgpa can themselves
  // be null values, but the keys are never omitted).
  job_role: string | null;
  venue: string | null;
  status: string;
  eligibility_cgpa: number | null;
  registered_count: number;
}

/** GET /me/upcoming-drives (Faculty/HoD) — institution-wide, not scoped to
 * any student. */
export function useUpcomingDrives() {
  return useQuery({
    queryKey: ["me", "upcoming-drives"],
    queryFn: () => apiClient.get<UpcomingDrive[]>("/me/upcoming-drives"),
  });
}

export interface MentoredStudent {
  student_id: number;
  student_id_no: string;
  name: string;
  section: string | null;
  department_name: string | null;
}

/** GET /me/mentored-students (Faculty) — every student in a class this
 * faculty mentors. Empty array if not a mentor of any class. */
export function useMentoredStudents() {
  return useQuery({
    queryKey: ["me", "mentored-students"],
    queryFn: () => apiClient.get<MentoredStudent[]>("/me/mentored-students"),
  });
}

export type DriveApplicationStatus = "applied" | "r1_cleared" | "r2_cleared" | "r3_cleared" | "rejected" | "placed";

export interface DriveApplicationRow {
  student_id: number;
  student_id_no: string;
  name: string;
  status: DriveApplicationStatus;
  last_cleared_round: number | null;
  offer_response: string | null;
  offered_package: number | null;
}

/** GET /me/upcoming-drives/:driveId/applications — real per-mentee
 * application status/round for a specific drive (student_drive_applications,
 * scoped to the caller's own mentee classes). There is no named-round
 * schema anywhere (no "Aptitude test"/"Technical round 1" labels) — only a
 * plain numeric last_cleared_round, so this is exactly what's shown. */
export function useDriveApplications(driveId: number | undefined) {
  return useQuery({
    queryKey: ["me", "upcoming-drives", driveId, "applications"],
    queryFn: () => apiClient.get<DriveApplicationRow[]>(`/me/upcoming-drives/${driveId}/applications`),
    enabled: Boolean(driveId),
  });
}

export interface StudentPlacementHistoryRow {
  drive_id: number;
  company_name: string;
  scheduled_date: string;
  drive_status: string;
  job_role: string | null;
  package_lpa: number | null;
  application_status: DriveApplicationStatus;
  last_cleared_round: string | null;
}

/** GET /me/mentored-students/:studentId/placement-history (Faculty — mentor
 * of that student's class only). Only concluded applications (rejected or
 * placed) — matches the student's own history view. */
export function useStudentPlacementHistory(studentId: number | undefined) {
  return useQuery({
    queryKey: ["me", "mentored-students", studentId, "placement-history"],
    queryFn: () => apiClient.get<StudentPlacementHistoryRow[]>(`/me/mentored-students/${studentId}/placement-history`),
    enabled: Boolean(studentId),
  });
}

/** Fetches placement history for every given student id in parallel — used
 * to compute real class-wide placement stats (placed count, highest/average
 * package, drives attended) since no aggregate endpoint exists for this. */
export function useAllMenteesPlacementHistory(studentIds: number[]) {
  return useQueries({
    queries: studentIds.map((id) => ({
      queryKey: ["me", "mentored-students", id, "placement-history"],
      queryFn: () => apiClient.get<StudentPlacementHistoryRow[]>(`/me/mentored-students/${id}/placement-history`),
    })),
  });
}
