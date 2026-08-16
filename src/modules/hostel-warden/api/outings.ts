import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export type OutingStatus = "pending" | "approved" | "rejected";

export interface Outing {
  id: number;
  student: { id: number; name: string; student_id_no: string; roll_no: string | null };
  hostel: { id: number; name: string; code: string } | null;
  room_number: string | null;
  from_date: string;
  to_date: string;
  start_time: string;
  return_time: string | null;
  reason: string | null;
  status: OutingStatus;
  approved_by_warden: string | null;
  created_at: string;
}

export interface OutingsPage {
  page: number;
  page_size: number;
  total: number;
  data: Outing[];
}

/**
 * The schema has one outing entity with no gate-pass-vs-leave type column,
 * so the Gate passes / Leave requests pages split on a derived rule instead
 * of a real field: same calendar day out-and-back reads as a gate pass
 * (local errand, medical visit); spanning more than one day reads as leave
 * (home visit etc). Real dates, honest heuristic — not a fabricated field.
 */
export function isMultiDayOuting(o: Outing): boolean {
  return o.to_date > o.from_date;
}

/** GET /hostel/outings?status=&page=&page_size= — hostel_id scoping is enforced server-side. */
export function useOutings(params: { status?: OutingStatus; page?: number; page_size?: number } = {}) {
  return useQuery({
    queryKey: ["hostel", "outings", params],
    queryFn: () => apiClient.get<OutingsPage>("/hostel/outings", params),
    refetchInterval: 60_000,
  });
}

/** PATCH /hostel/outings/:id/decision */
export function useDecideOuting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision }: { id: number; decision: "approved" | "rejected" }) =>
      apiClient.patch<Outing>(`/hostel/outings/${id}/decision`, { decision }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hostel", "outings"] });
      queryClient.invalidateQueries({ queryKey: ["hostel", "dashboard", "summary"] });
    },
  });
}
