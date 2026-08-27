import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

/** Only these ever occur on a routed_to_warden:true row (see backend LeaveRequestsService). */
export type HostelLeaveDecidableStatus = "pending" | "rejected" | "warden_approved";

export interface HostelLeaveRequest {
  id: number;
  student: { id: number; name: string; student_id_no: string; roll_no: string | null };
  hostel: { id: number; name: string; code: string } | null;
  room_number: string | null;
  from_date: string;
  to_date: string;
  reason: string | null;
  status: HostelLeaveDecidableStatus;
  approved_by_warden: string | null;
  created_at: string;
}

export interface HostelLeaveRequestsPage {
  page: number;
  page_size: number;
  total: number;
  data: HostelLeaveRequest[];
}

/**
 * GET /hostel/leave-requests?status=&page=&page_size= — Hostel-tab leaves
 * (student_leaves, routed_to_warden: true) submitted straight to the Warden,
 * skipping Faculty/HoD entirely. hostel_id scoping is enforced server-side.
 */
export function useHostelLeaveRequests(params: { status?: HostelLeaveDecidableStatus; page?: number; page_size?: number } = {}) {
  return useQuery({
    queryKey: ["hostel", "leave-requests", params],
    queryFn: () => apiClient.get<HostelLeaveRequestsPage>("/hostel/leave-requests", params),
    refetchInterval: 60_000,
  });
}

/** PATCH /hostel/leave-requests/:id/decision */
export function useDecideHostelLeaveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision }: { id: number; decision: "approved" | "rejected" }) =>
      apiClient.patch<HostelLeaveRequest>(`/hostel/leave-requests/${id}/decision`, { decision }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hostel", "leave-requests"] });
      queryClient.invalidateQueries({ queryKey: ["hostel", "dashboard", "summary"] });
    },
  });
}

export type AcademicLeaveStatus = "pending" | "faculty_approved" | "hod_approved" | "rejected";

export interface AcademicHostelLeave {
  id: number;
  student: { id: number; name: string; student_id_no: string; roll_no: string | null };
  from_date: string;
  to_date: string;
  reason: string | null;
  /** Academic-chain status only — a routed_to_warden:true row never appears here, so warden_approved can't occur. */
  status: AcademicLeaveStatus;
  created_at: string;
}

export interface AcademicHostelLeavesPage {
  page: number;
  page_size: number;
  total: number;
  data: AcademicHostelLeave[];
}

/**
 * GET /hostel/leave-requests/from-academic-leave — read-only visibility into
 * academic Leave-tab requests (Student -> Advisor -> HoD chain) the student
 * flagged "Also on hostel leave". Status mirrors the academic chain as it
 * moves through Faculty then HoD; the Warden cannot decide these here, only
 * see them (see checkbox copy on the student's Leave form).
 */
export function useAcademicHostelLeaves(params: { page?: number; page_size?: number } = {}) {
  return useQuery({
    queryKey: ["hostel", "leave-requests", "from-academic-leave", params],
    queryFn: () => apiClient.get<AcademicHostelLeavesPage>("/hostel/leave-requests/from-academic-leave", params),
    refetchInterval: 60_000,
  });
}
