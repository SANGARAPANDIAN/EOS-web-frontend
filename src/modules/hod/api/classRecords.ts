import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface HodClassSummary {
  class_id: number;
  section: string;
  year: string;
  semester: number;
  student_count: number;
  batch_id: number;
  batch_name: string;
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
  /** True when viewing a past year of this same class — only the GPA column reflects that year; attendance/arrears/fees/placement below are always today's real totals. */
  is_historical_view: boolean;
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

/** GET /hod/class-records/:classId — pass `semester` to view a past year of this same class (e.g. Year I of a batch now in Year III); omit for the class's live current semester. */
export function useHodClassDetail(classId: number | null, semester?: number) {
  return useQuery({
    queryKey: ["hod", "class-records", classId, semester ?? "current"],
    queryFn: () =>
      apiClient.get<HodClassDetail>(`/hod/class-records/${classId}`, semester ? { semester } : undefined),
    enabled: classId !== null,
  });
}
