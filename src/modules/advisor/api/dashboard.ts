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

/** GET /me/mentee-classes/:class_id/students */
export function useMenteeRoster(classId: number | undefined) {
  return useQuery({
    queryKey: ["me", "mentee-classes", classId, "students"],
    queryFn: () => apiClient.get<MenteeClassResult>(`/me/mentee-classes/${classId}/students`),
    enabled: Boolean(classId),
  });
}
