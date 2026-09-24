import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// Backend reference: EOSbackend1/src/modules/hod/hod-placements.service.ts
// getInternshipDrives()/getInternshipStudents() — internships are a
// drive_type on the same placement_drives table Placements already uses,
// not a separate concept (see internship_drive_type.query.md). Real data
// once that migration runs; empty lists until then, same schema-gap
// convention as everywhere else in this repo.

export interface HodInternshipStudentRow {
  student_id: number;
  student_id_no: string;
  name: string | null;
  class_label: string | null;
  company: string | null;
  stipend_amount: number | null;
  offers: number;
  status: "placed" | "in_process" | "unplaced";
}

export interface HodInternshipEligibleClass {
  class_id: number;
  section: string;
  semester: number;
  year_label: string;
  class_label: string;
}

export interface HodInternshipStudents {
  department: { id: number; name: string; code: string };
  classes: HodInternshipEligibleClass[];
  selected_class_id: number | null;
  counts: { placed: number; in_process: number; unplaced: number };
  rows: HodInternshipStudentRow[];
}

/** GET /hod/internships/students?search=&class_id= */
export function useHodInternshipStudents(search: string, classId: number | null) {
  return useQuery({
    queryKey: ["hod", "internships", "students", search, classId],
    queryFn: () =>
      apiClient.get<HodInternshipStudents>("/hod/internships/students", {
        search: search || undefined,
        class_id: classId ?? undefined,
      }),
  });
}

export interface HodInternshipDrive {
  id: number;
  company_name: string;
  job_role: string | null;
  stipend_amount: number | null;
  duration_months: number | null;
  scheduled_date: string;
  registration_start: string | null;
  registration_end: string | null;
  status: string;
}

/** GET /hod/internships/drives */
export function useHodUpcomingInternshipDrives() {
  return useQuery({
    queryKey: ["hod", "internships", "drives"],
    queryFn: () => apiClient.get<HodInternshipDrive[]>("/hod/internships/drives"),
  });
}
