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
// KNOWN BACKEND GAP (not faked): the real `attendance_status_enum` this
// endpoint writes to only has `present`/`absent` — there is NO `on_duty`/
// "OD" value reachable through this particular endpoint (that only exists
// on `faculty_daily_attendance`, a different table for staff, and on a
// separate Faculty-only "mark class attendance" endpoint that Secretary
// hasn't been granted). The design's 3-way Present/Absent/OD toggle is
// therefore genuinely 2-way (Present/Absent) here — OD is dropped from
// the Mark tab rather than faked as a real write.
//
// KNOWN GAP: there is no attendance changelog/audit-trail table anywhere
// in the schema — attendance_records rows themselves (with
// marked_by_user_id) are the only history. The History tab's person-search
// and "who changed what" feature from the design has no real backing and
// is replaced with a real "attendance already marked for this class+date"
// read instead.

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
  status: "present" | "absent";
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

/** GET /me/attendance?class_id=&date= */
export function useAttendanceRecords(params: { class_id?: number; date?: string }) {
  const qs = new URLSearchParams();
  if (params.class_id !== undefined) qs.set("class_id", String(params.class_id));
  if (params.date) qs.set("date", params.date);
  qs.set("limit", "100");
  return useQuery({
    queryKey: ["secretary", "attendance", params],
    queryFn: () => apiClient.get<AttendanceListResponse>(`/me/attendance?${qs.toString()}`),
    enabled: params.class_id !== undefined,
  });
}

export interface CreateAttendanceInput {
  class_id: number;
  subject_id?: number;
  date: string;
  records: { student_id: number; status: "present" | "absent" }[];
}

/** POST /me/attendance */
export function useCreateAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAttendanceInput) => apiClient.post("/me/attendance", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["secretary", "attendance"] }),
  });
}
