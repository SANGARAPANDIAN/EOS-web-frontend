import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// Backend reference: EOSbackend1/src/modules/faculty/{attendance,timetable}/*.
// {controller,service}.ts — real attendance-marking + timetable modules
// already existed (Faculty-only before this). Secretary added to
// `POST/GET /attendance` and `GET /timetable-slots`; the attendance
// service previously required a `faculty` table row for every marker —
// added a Secretary branch that leaves `marked_by_faculty_id` null (the
// column was already nullable), same pattern as media-requests.
//
// CORRECTED: an earlier pass here wrongly claimed attendance_status_enum
// only has present/absent. It actually has all 3 values
// (present/absent/on_duty) and the create endpoint already accepted
// 'on_duty' — the 3-way Present/Absent/OD toggle is real, not dropped.
//
// GET /me/attendance-records — renamed from the bare 'me/attendance',
// which was silently shadowed by a student-only profile route registered
// earlier in app.module.ts (a real pre-existing bug affecting every
// role). Fixed by renaming the route, not by touching that module.
//
// KNOWN GAP: there is no attendance changelog/audit-trail table anywhere
// in the schema — attendance_records rows themselves (with
// marked_by_user_id) are the only history, so "who changed this mark,
// from what to what" specifically has no real backing. Everything else
// in the History tab (person search, per-person marking history) is
// computed live from real attendance_records.

export interface TimetableSlot {
  id: number;
  day_of_week: number;
  period_number: number;
  start_time: string;
  end_time: string;
  academic_year: string;
  semester: number;
  class: { id: number; section: string; department: { id: number; name: string; code: string } };
  subject: { id: number; name: string; subject_code: string };
  faculty: { id: number; first_name: string; last_name: string } | null;
}
export interface TimetableSlotsResponse {
  data: TimetableSlot[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

/** GET /me/timetable-slots?class_id= */
export function useTimetableSlots(classId: number | undefined) {
  return useQuery({
    queryKey: ["secretary", "timetable-slots", classId],
    queryFn: () => apiClient.get<TimetableSlotsResponse>(`/me/timetable-slots?class_id=${classId}&limit=50`),
    enabled: classId !== undefined,
  });
}

export interface AttendanceRecordRow {
  id: number;
  date: string;
  status: "present" | "absent" | "on_duty";
  is_published: boolean;
  class: { id: number; section: string; department: { id: number; name: string; code: string } };
  subject: { id: number; name: string; subject_code: string } | null;
  faculty: { id: number; first_name: string; last_name: string } | null;
  student: { id: number; student_id_no: string; roll_no: string | null; first_name: string | null; last_name: string | null };
}
export interface AttendanceListResponse {
  data: AttendanceRecordRow[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

/**
 * GET /me/attendance-records?class_id=&date= — renamed from the bare
 * 'me/attendance' path, which was silently shadowed by a student-only
 * profile route registered earlier in app.module.ts (a real, pre-existing
 * backend bug affecting every role, not just Secretary — fixed by
 * renaming the route on the module that already grants Secretary access,
 * without touching the unrelated student-profile module).
 */
export function useAttendanceRecords(params: { class_id?: number; date?: string; student_id?: number }) {
  const qs = new URLSearchParams();
  if (params.class_id !== undefined) qs.set("class_id", String(params.class_id));
  if (params.date) qs.set("date", params.date);
  if (params.student_id !== undefined) qs.set("student_id", String(params.student_id));
  qs.set("limit", "100");
  return useQuery({
    queryKey: ["secretary", "attendance", params],
    queryFn: () => apiClient.get<AttendanceListResponse>(`/me/attendance-records?${qs.toString()}`),
    enabled: params.class_id !== undefined || params.student_id !== undefined,
  });
}

export interface CreateAttendanceInput {
  class_id: number;
  subject_id?: number;
  date: string;
  records: { student_id: number; status: "present" | "absent" | "on_duty" }[];
}

/** POST /me/attendance */
export function useCreateAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAttendanceInput) => apiClient.post("/me/attendance", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["secretary", "attendance"] }),
  });
}
