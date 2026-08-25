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

/**
 * GET /hostel/gate-log?entry_type=&q=&page=&page_size= — hostel_id scoping is
 * enforced server-side.
 *
 * `q` is matched in the database (case-insensitively, across name, roll no,
 * register no, student id and room) rather than in the browser, so a search
 * covers every record and not just the page already loaded.
 */
export function useGateLog(
  params: { entry_type?: EntryType; q?: string; page?: number; page_size?: number } = {},
) {
  return useQuery({
    queryKey: ["hostel", "gate-log", params],
    queryFn: () => apiClient.get<GateLogPage>("/hostel/gate-log", params),
    refetchInterval: 60_000,
    placeholderData: (prev) => prev,
  });
}

export interface HostelStudentMatch {
  student_id: number;
  name: string;
  roll_no: string | null;
  register_no: string | null;
  student_type: string | null;
  photo_url: string | null;
  room_number: string | null;
  hostel_name: string | null;
  class_label: string | null;
  is_currently_out: boolean;
}

/**
 * GET /hostel/gate-log/search?q= — type-ahead pick-list for choosing a
 * student when logging a movement. A dropdown of every resident cannot work at
 * this scale (the list was also capped at one page, so most students were not
 * even selectable); this searches the whole roll instead.
 */
export function useHostelStudentSearch(term: string) {
  const q = term.trim();
  return useQuery({
    queryKey: ["hostel", "student-search", q],
    queryFn: () => apiClient.get<HostelStudentMatch[]>("/hostel/gate-log/search", { q }),
    enabled: q.length >= 2,
    placeholderData: (prev) => prev,
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
