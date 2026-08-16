import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// Backend reference: EOSbackend1/src/modules/secretary-portal/outpass/*.
// {controller,service}.ts — new module built this session (real
// `student_outpasses` table, added via the Secretary module completion
// migration). Institution-wide for Secretary/Admin/Principal. Mentor name
// is real too (joined through the real `class_mentors` table).

export type OutpassStatus = "pending" | "approved" | "rejected";

export interface OutpassRow {
  id: number;
  student: { id: number; name: string; student_id_no: string; section: string | null };
  mentor_name: string | null;
  kind: string;
  outpass_date: string;
  from_time: string;
  to_time: string;
  reason: string;
  parent_contact: string | null;
  status: OutpassStatus;
  approved_at: string | null;
  created_at: string;
}
export interface OutpassResponse {
  data: OutpassRow[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export function useOutpasses(status?: OutpassStatus) {
  const qs = status ? `&status=${status}` : "";
  return useQuery({
    queryKey: ["secretary", "outpasses", status],
    queryFn: () => apiClient.get<OutpassResponse>(`/me/student-outpasses?limit=100${qs}`),
  });
}

export function useUpdateOutpassStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: "approved" | "rejected" }) => apiClient.patch(`/me/student-outpasses/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["secretary", "outpasses"] }),
  });
}
