import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// Backend reference: GET /me/classes/today (MeClassesController, FACULTY/HOD)
// — today's timetable slots for the logged-in faculty. Powers the
// Dashboard's "Up next" panel and the "Classes today" KPI. No dashboard
// aggregate endpoint exists in EOSbackend1, so the Dashboard page composes
// several existing endpoints rather than one — see advisor-backend-wiring
// memory.

// Exact shape confirmed from TimetableService.findTodayForFaculty /
// toTodaySlotResponse — there is NO room field and NO completed flag on
// this endpoint at all (not select'd, not mapped). "done vs upcoming" on
// the Dashboard is derived client-side by comparing start_time to now,
// since the backend doesn't track a completed flag.
export interface TodayClassSlot {
  id: number;
  period_number: number;
  start_time: string;
  end_time: string;
  subject_id: number;
  subject_name: string;
  class_id: number;
  class_section: string;
  department_name: string;
}

/** GET /me/classes/today */
export function useTodayClasses() {
  return useQuery({
    queryKey: ["me", "classes", "today"],
    queryFn: () => apiClient.get<TodayClassSlot[]>("/me/classes/today"),
  });
}

// Exact shape confirmed from ClassMentorsService.getMenteeClassResult —
// this is a single object (not an array), with a `students` array inside.
export interface MenteeRosterStudent {
  id: number;
  name: string;
  student_id_no: string;
  roll_no: string | null;
  register_no: string | null;
  attendance_percent: number | null;
  cgpa: number | null;
  /** GPA for the highest semester this student has any published marks in — distinct from `cgpa` (all-time). */
  current_semester_gpa: number | null;
  arrears: number;
  guardian_name: string | null;
  guardian_relation: "Father" | "Mother" | null;
  contact: string | null;
}

export interface MenteeClassResult {
  class: { id: number; label: string };
  department: { id: number; name: string; code: string };
  academic_year: string;
  mentor: { id: number; name: string };
  students: MenteeRosterStudent[];
}

/**
 * GET /me/mentee-classes/:class_id/students
 * `scope: "today"` narrows attendance_percent to attendance_records dated
 * today (Dashboard's Today/This term toggle); omit it (every other caller)
 * for the original all-time computation.
 */
export function useMenteeRoster(classId: number | undefined, scope?: "today") {
  return useQuery({
    queryKey: ["me", "mentee-classes", classId, "students", scope ?? "term"],
    queryFn: () =>
      apiClient.get<MenteeClassResult>(`/me/mentee-classes/${classId}/students`, scope ? { scope } : undefined),
    enabled: Boolean(classId),
  });
}
