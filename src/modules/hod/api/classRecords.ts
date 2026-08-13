import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface HodClassSummary {
  class_id: number;
  section: string;
  year: string;
  semester: number;
  student_count: number;
}

/** GET /hod/class-records/classes */
export function useHodClasses() {
  return useQuery({
    queryKey: ["hod", "class-records", "classes"],
    queryFn: () => apiClient.get<HodClassSummary[]>("/hod/class-records/classes"),
  });
}

export interface HodClassAdvisor {
  name: string;
  designation: string;
  department_code: string;
  phone: string | null;
  email: string | null;
}

export interface HodClassStudentRow {
  student_id: number;
  student_id_no: string;
  name: string;
  photo_url: string | null;
  class_label: string;
  gpa: number | null;
  cgpa: number | null;
  arrears: number;
  attendance_percent: number | null;
  fee_status: "paid" | "partial" | "pending";
  fee_due: number;
  is_placed: boolean;
  at_risk: boolean;
  flags: { label: string; tone: "red" | "amber" | "green" | "grey" }[];
}

export interface HodClassDetail {
  class: {
    class_id: number;
    section: string;
    semester: number | null;
    year: string | null;
    department_name: string;
    department_code: string;
    classroom: string | null;
    student_count: number;
  };
  advisor: HodClassAdvisor | null;
  stats: {
    mean_attendance: number | null;
    average_cgpa: number | null;
    placed_count: number;
    eligible_count: number;
    fees_pending_count: number;
    student_count: number;
  } | null;
  students: HodClassStudentRow[];
}

/** GET /hod/class-records/:classId */
export function useHodClassDetail(classId: number | null) {
  return useQuery({
    queryKey: ["hod", "class-records", classId],
    queryFn: () => apiClient.get<HodClassDetail>(`/hod/class-records/${classId}`),
    enabled: classId !== null,
  });
}
