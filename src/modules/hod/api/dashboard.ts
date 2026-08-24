import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface HodDashboard {
  department: { id: number; name: string; code: string };
  faculty: { id: number; name: string; designation: string };
  scope: "today" | "term";
  student_attendance: {
    percentage: number;
    present: number;
    on_roll: number;
    student_count: number;
    class_count: number;
    classes_above_threshold: number;
    classes_above_threshold_total: number;
  };
  faculty_attendance: {
    percentage: number;
    reported: number;
    on_roll: number;
    on_leave: number;
    on_duty: number;
  };
  average_cgpa: { value: number | null; change: number | null };
  placements: {
    placed_count: number;
    eligible_count: number;
    highest_package_lpa: number | null;
    average_package_lpa: number | null;
  };
  needs_attention: {
    flags: { type: string; title: string; detail: string }[];
    below_threshold_student_count: number;
    pending_requests_count: number;
    pending_leaves_count: number;
    pending_ods_count: number;
  };
  up_next: {
    id: number;
    period_label: string;
    subject_code: string;
    subject_name: string;
    class_label: string;
    start_time: string;
    end_time: string;
  }[];
  announcements: { id: number; title: string; tag: string; posted_at: string }[];
  my_department: {
    name: string;
    code: string;
    class_count: number;
    student_count: number;
    faculty_count: number;
    attendance_percent: number;
    below_threshold_count: number;
    average_cgpa: number | null;
    arrears_count: number | null;
    placed_count: number;
    eligible_count: number;
    pending_requests_count: number;
    pending_sop_count: number;
    pending_pop_count: number;
  };
}

/** GET /hod/dashboard?scope=today|term */
export function useHodDashboard(scope: "today" | "term" = "today") {
  return useQuery({
    queryKey: ["hod", "dashboard", scope],
    queryFn: () => apiClient.get<HodDashboard>("/hod/dashboard", { scope }),
  });
}
