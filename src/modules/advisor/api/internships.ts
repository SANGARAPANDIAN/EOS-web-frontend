import { useQueries, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// Internship-only mirror of ./placements.ts — Internships are a drive_type
// on the same placement_drives table Placements already reads (see
// EOSbackend1/internship_drive_type.query.md), not a separate concept.
// useMentoredStudents()/useDriveApplications() are reused as-is from
// ./placements.ts (drive-type-agnostic — scoped by driveId/mentee class,
// not by what kind of drive it is).

export interface UpcomingInternshipDrive {
  drive_id: number;
  company_name: string;
  company_profile_info: string | null;
  scheduled_date: string;
  is_disclosed: boolean;
  disclosed_reveal_date: string | null;
  job_role: string | null;
  venue: string | null;
  status: string;
  stipend_amount: number | null;
  duration_months: number | null;
  registered_count: number;
}

/** GET /me/upcoming-internship-drives (Faculty/HoD) — institution-wide. */
export function useUpcomingInternshipDrives() {
  return useQuery({
    queryKey: ["me", "upcoming-internship-drives"],
    queryFn: () => apiClient.get<UpcomingInternshipDrive[]>("/me/upcoming-internship-drives"),
  });
}

export interface InternshipHistoryRow {
  drive_id: number;
  company_name: string;
  scheduled_date: string;
  drive_status: string;
  job_role: string | null;
  stipend_amount: number | null;
  duration_months: number | null;
  application_status: "applied" | "r1_cleared" | "r2_cleared" | "r3_cleared" | "rejected" | "placed";
  last_cleared_round: number | null;
}

/** GET /me/mentored-students/:studentId/internship-history (Faculty — mentor of that student's class only). */
export function useStudentInternshipHistory(studentId: number | undefined) {
  return useQuery({
    queryKey: ["me", "mentored-students", studentId, "internship-history"],
    queryFn: () => apiClient.get<InternshipHistoryRow[]>(`/me/mentored-students/${studentId}/internship-history`),
    enabled: Boolean(studentId),
  });
}

/** Fetches internship history for every given student id in parallel — same pattern as useAllMenteesPlacementHistory. */
export function useAllMenteesInternshipHistory(studentIds: number[]) {
  return useQueries({
    queries: studentIds.map((id) => ({
      queryKey: ["me", "mentored-students", id, "internship-history"],
      queryFn: () => apiClient.get<InternshipHistoryRow[]>(`/me/mentored-students/${id}/internship-history`),
    })),
  });
}
