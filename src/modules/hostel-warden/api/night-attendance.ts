import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface AttendanceException {
  student_id: number;
  name: string;
  roll: string;
  room_number: string;
}

export type RollCallStatus = "present" | "absent" | "on_leave" | "pending";

export interface RosterRow {
  student_id: number;
  name: string;
  roll: string;
  room_number: string;
  status: RollCallStatus;
  /** True while the mark is still a draft, i.e. not yet published. */
  is_draft: boolean;
}

export interface NightAttendanceSummary {
  date: string;
  total_residents: number;
  present: number;
  absent: number;
  on_leave: number;
  pending: number;
  /** Marks still awaiting publication. */
  draft_count: number;
  /** Residents with any mark at all, draft or published. */
  marked_count: number;
  /** True only once something has been marked and nothing is left in draft. */
  is_published: boolean;
  exceptions: AttendanceException[];
  roster: RosterRow[];
}

/**
 * GET /hostel/night-attendance?date= — hostel_id scoping is enforced
 * server-side. Each date is its own sheet, so passing a date moves the whole
 * page to that night's roll call.
 */
export function useNightAttendance(date?: string) {
  return useQuery({
    queryKey: ["hostel", "night-attendance", date ?? "today"],
    queryFn: () =>
      apiClient.get<NightAttendanceSummary>("/hostel/night-attendance", date ? { date } : undefined),
    refetchInterval: 60_000,
    placeholderData: (prev) => prev,
  });
}

/** POST /hostel/night-attendance/:studentId — saves a draft mark. */
export function useMarkAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ studentId, status, date }: { studentId: number; status: "present" | "absent"; date?: string }) =>
      apiClient.post(`/hostel/night-attendance/${studentId}`, { status, date }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hostel", "night-attendance"] }),
  });
}

/** POST /hostel/night-attendance/resolve-all — drafts "present" for anyone unmarked. */
export function useResolveAllAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (date?: string) =>
      apiClient.post<{ resolved: number }>("/hostel/night-attendance/resolve-all", { date }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hostel", "night-attendance"] }),
  });
}

/** POST /hostel/night-attendance/publish — commits the night's draft sheet. */
export function usePublishAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (date?: string) =>
      apiClient.post<{ published: number; date: string }>("/hostel/night-attendance/publish", { date }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hostel", "night-attendance"] }),
  });
}
