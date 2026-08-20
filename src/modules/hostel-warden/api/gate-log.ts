import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export type EntryType = "in" | "out";

export interface GateLogEntry {
  id: number;
  student: { id: number; name: string; student_id_no: string; roll_no: string | null };
  hostel: { id: number; name: string; code: string } | null;
  room_number: string | null;
  entry_type: EntryType;
  outing_id: number | null;
  recorded_at: string;
  recorded_by: string | null;
}

export interface GateLogPage {
  page: number;
  page_size: number;
  total: number;
  data: GateLogEntry[];
}

/** GET /hostel/gate-log?entry_type=&page=&page_size= — hostel_id scoping is enforced server-side. */
export function useGateLog(params: { entry_type?: EntryType; page?: number; page_size?: number } = {}) {
  return useQuery({
    queryKey: ["hostel", "gate-log", params],
    queryFn: () => apiClient.get<GateLogPage>("/hostel/gate-log", params),
    refetchInterval: 60_000,
  });
}

/** POST /hostel/gate-log */
export function useLogMovement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { student_id: number; entry_type: EntryType; outing_id?: number }) =>
      apiClient.post<GateLogEntry>("/hostel/gate-log", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hostel", "gate-log"] }),
  });
}
