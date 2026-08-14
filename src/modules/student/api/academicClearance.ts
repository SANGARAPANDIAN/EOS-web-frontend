import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface ClearanceAssignment {
  id: number;
  title: string;
  sequence_no: number | null;
  is_submitted: boolean;
}

export interface AcademicClearanceSubject {
  subject_id: number;
  subject_name: string;
  subject_code: string | null;
  assignments: ClearanceAssignment[];
  all_assignments_submitted: boolean;
  attendance_percentage: number | null;
  attendance_cleared: boolean;
  cleared: boolean;
}

export interface AcademicClearance {
  semester: number | null;
  subjects: AcademicClearanceSubject[];
}

/** GET /me/academic-clearance?semester=<n> — omit semester for the student's current semester. */
export function useMyAcademicClearance(semester: number | null) {
  return useQuery({
    queryKey: ["me", "academic-clearance", semester],
    queryFn: () =>
      apiClient.get<AcademicClearance>("/me/academic-clearance", {
        semester: semester ?? undefined,
      }),
  });
}
