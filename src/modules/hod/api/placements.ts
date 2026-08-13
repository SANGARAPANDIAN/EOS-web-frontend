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
