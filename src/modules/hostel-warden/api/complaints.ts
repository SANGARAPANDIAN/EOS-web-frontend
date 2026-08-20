import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export type ComplaintStatus = "open" | "in_progress" | "resolved" | "escalated";
export type ComplaintCategory = "plumbing" | "electrical" | "carpentry" | "network" | "mess" | "facilities" | "other";
export type ComplaintPriority = "low" | "medium" | "high";

export interface Complaint {
  id: number;
  student: { id: number; name: string; student_id_no: string };
  hostel: { id: number; name: string; code: string } | null;
  room_number: string | null;
  category: ComplaintCategory;
  title: string;
  description: string | null;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  assigned_to: string | null;
  resolution_note: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface ComplaintsPage {
  page: number;
  page_size: number;
  total: number;
  data: Complaint[];
}

/** GET /hostel/complaints?status=&category=&page=&page_size= — hostel_id scoping is enforced server-side. */
export function useComplaints(params: { status?: ComplaintStatus; category?: ComplaintCategory; page?: number; page_size?: number } = {}) {
  return useQuery({
    queryKey: ["hostel", "complaints", params],
    queryFn: () => apiClient.get<ComplaintsPage>("/hostel/complaints", params),
    refetchInterval: 60_000,
  });
}

/** PATCH /hostel/complaints/:id */
export function useUpdateComplaint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: ComplaintStatus }) =>
      apiClient.patch<Complaint>(`/hostel/complaints/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hostel", "complaints"] });
      queryClient.invalidateQueries({ queryKey: ["hostel", "dashboard", "summary"] });
    },
  });
}
