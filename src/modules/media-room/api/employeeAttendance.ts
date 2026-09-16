import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface MediaRoomAttendanceDay {
  date: string;
  day: string;
  punch_in: string | null;
  punch_out: string | null;
  status: string;
  duration: string | null;
  note: string | null;
}

export interface MediaRoomAttendanceMonth {
  month: string;
  label: string;
  days: MediaRoomAttendanceDay[];
  full_days: number;
  half_days: number;
  absent: number;
  on_leave: number;
  on_duty: number;
  on_vacation: number;
  attendance_percentage: number;
}

export interface MediaRoomMyAttendance {
  ready: boolean;
  overall: {
    full_days: number;
    half_days: number;
    absent: number;
    on_leave: number;
    on_duty: number;
    on_vacation: number;
    attendance_percentage: number;
  } | null;
  months: MediaRoomAttendanceMonth[];
  recent_punches: MediaRoomAttendanceDay[];
}

/** GET /media-room/employee/attendance */
export function useMediaRoomMyAttendance() {
  return useQuery({
    queryKey: ["media-room", "employee", "attendance"],
    queryFn: () => apiClient.get<MediaRoomMyAttendance>("/media-room/employee/attendance"),
  });
}

/** Matches the real faculty_attendance_status_enum exactly — no "on_vacation" value exists there. */
export type MarkAttendanceStatus = "full_day" | "half_day" | "absent" | "on_duty" | "on_leave";

/** POST /media-room/employee/attendance/mark — self-declared, no biometric device behind this. */
export function useMarkMediaRoomAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { status: MarkAttendanceStatus; date?: string }) =>
      apiClient.post("/media-room/employee/attendance/mark", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["media-room", "employee", "attendance"] }),
  });
}
