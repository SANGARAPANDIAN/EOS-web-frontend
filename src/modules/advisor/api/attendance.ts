import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// Backend reference (exact shapes confirmed by reading the actual controllers/DTOs):
//   POST /me/classes/:class_id/attendance/recognize  — draft roster (AttendanceCvController)
//   POST /me/classes/:class_id/attendance             — mark attendance (MeClassesAttendanceController)
//   GET  /attendance                                  — view marked history (AttendanceController)
// Faculty-marking status enum is 'present' | 'absent' | 'on_duty' (3 values) —
// NOT the same enum as the plain /attendance endpoint, which only allows
// 'present' | 'absent'. The roster-marking screen uses the class-scoped
// endpoint below, which is the one that actually supports on_duty.

export interface RosterStudent {
  student_id: number;
  student_id_no: string;
  name: string;
  has_face_data: boolean;
  suggested_status: "present" | "absent" | null;
}

export interface RecognizeAttendanceResponse {
  class_id: number;
  subject_id: number;
  analyzed: boolean;
  photo_url: string | null;
  students: RosterStudent[];
}

/** POST /me/classes/:class_id/attendance/recognize — called with no images
 * to fetch the plain roster (no face recognition), per the confirmed DTO
 * (images is optional). */
export function useClassRoster(classId: number | undefined, subjectId: number | undefined) {
  return useQuery({
    queryKey: ["me", "classes", classId, "attendance", "roster", subjectId],
    queryFn: () => apiClient.post<RecognizeAttendanceResponse>(`/me/classes/${classId}/attendance/recognize`, { subject_id: subjectId }),
    enabled: Boolean(classId && subjectId),
  });
}

export type AttendanceMarkStatus = "present" | "absent" | "on_duty";

export interface MarkClassAttendanceInput {
  classId: number;
  subject_id: number;
  attendance_date: string; // ISO date
  photo_url?: string;
  records: { student_id: number; status: AttendanceMarkStatus }[];
}

/** POST /me/classes/:class_id/attendance — saves as a draft (is_published
 * false); real-time visibility to students/parents only happens after
 * usePublishClassAttendance is called, exactly like Subject Records. */
export function useMarkClassAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ classId, ...body }: MarkClassAttendanceInput) =>
      apiClient.post<{ class_id: number; attendance_date: string; marked: number; is_published: boolean }>(`/me/classes/${classId}/attendance`, body),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["me", "classes", vars.classId, "attendance", "draft"] });
    },
  });
}

export interface AttendanceDraft {
  class_id: number;
  subject_id: number;
  attendance_date: string;
  is_published: boolean;
  records: { student_id: number; status: AttendanceMarkStatus }[];
}

/** GET /me/classes/:class_id/attendance/draft?subject_id=&date= — re-hydrates
 * a previously saved (draft or published) batch so the marking screen can be
 * reopened before Publish, or shows the already-published state read-only. */
export function useAttendanceDraft(classId: number | undefined, subjectId: number | undefined, date: string) {
  return useQuery({
    queryKey: ["me", "classes", classId, "attendance", "draft", subjectId, date],
    queryFn: () => apiClient.get<AttendanceDraft>(`/me/classes/${classId}/attendance/draft`, { subject_id: subjectId, date }),
    enabled: Boolean(classId && subjectId && date),
  });
}

export interface PublishClassAttendanceInput {
  classId: number;
  subject_id: number;
  attendance_date: string;
}

/** POST /me/classes/:class_id/attendance/publish — the moment saved draft
 * attendance becomes visible to students/parents/advisors, in real time. */
export function usePublishClassAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ classId, ...body }: PublishClassAttendanceInput) =>
      apiClient.post<{ published: number; published_at: string }>(`/me/classes/${classId}/attendance/publish`, body),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["me", "classes", vars.classId, "attendance", "draft"] });
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
  });
}

export interface AttendanceHistoryRow {
  id: number;
  date: string;
  status: string;
  class: { id: number; section: string; department: { id: number; name: string; code: string } };
  subject: { id: number; name: string; subject_code: string } | null;
  student: { id: number; student_id_no: string; roll_no: string | null; first_name: string | null; last_name: string | null };
}

/** GET /attendance */
export function useAttendanceHistory(params: { class_id?: number; date?: string }) {
  return useQuery({
    queryKey: ["attendance", "history", params.class_id, params.date],
    queryFn: () => apiClient.get<{ data: AttendanceHistoryRow[]; total: number }>("/attendance", params),
    enabled: Boolean(params.class_id),
  });
}
