import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface AttendanceException {
  student_id: number;
  name: string;
  roll: string;
  room_number: string;
}

export interface NightAttendanceSummary {
  date: string;
  total_residents: number;
  present: number;
  absent: number;
  on_leave: number;
  pending: number;
  exceptions: AttendanceException[];
}

/** GET /hostel/night-attendance?date= — hostel_id scoping is enforced server-side. */
export function useNightAttendance(date?: string) {
  return useQuery({
    queryKey: ["hostel", "night-attendance", date ?? "today"],
    queryFn: () => apiClient.get<NightAttendanceSummary>("/hostel/night-attendance", date ? { date } : undefined),
    refetchInterval: 60_000,
  });
}

/** POST /hostel/night-attendance/:studentId */
export function useMarkAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ studentId, status, date }: { studentId: number; status: "present" | "absent"; date?: string }) =>
      apiClient.post(`/hostel/night-attendance/${studentId}`, { status, date }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hostel", "night-attendance"] }),
  });
}

/** POST /hostel/night-attendance/resolve-all */
export function useResolveAllAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (date?: string) => apiClient.post<{ resolved: number }>("/hostel/night-attendance/resolve-all", { date }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hostel", "night-attendance"] }),
  });
}
