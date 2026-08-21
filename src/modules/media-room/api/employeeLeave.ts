import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface MediaRoomLeaveType {
  id: number;
  name: string;
  default_annual_quota: number;
}

/** GET /media-room/employee/leave/types */
export function useMediaRoomLeaveTypes() {
  return useQuery({
    queryKey: ["media-room", "employee", "leave", "types"],
    queryFn: () => apiClient.get<MediaRoomLeaveType[]>("/media-room/employee/leave/types"),
  });
}

export interface MediaRoomLeaveBalance {
  leave_type_id: number;
  leave_type: string;
  allocated: number;
  used: number;
  remaining: number;
}

/** GET /media-room/employee/leave/balances */
export function useMediaRoomLeaveBalances() {
  return useQuery({
    queryKey: ["media-room", "employee", "leave", "balances"],
    queryFn: () => apiClient.get<MediaRoomLeaveBalance[]>("/media-room/employee/leave/balances"),
  });
}

export interface MediaRoomLeaveHistoryRow {
  id: number;
  from_date: string;
  to_date: string;
  reason: string | null;
  leave_type: { id: number; name: string } | null;
  overall_status: "pending" | "approved" | "rejected";
  created_at: string;
}

interface ReadyResponse<T> {
  ready: boolean;
  data: T[];
}

/** GET /media-room/employee/leave/history?status= */
export function useMediaRoomLeaveHistory(status?: "pending" | "approved" | "rejected") {
  return useQuery({
    queryKey: ["media-room", "employee", "leave", "history", status],
    queryFn: () => apiClient.get<ReadyResponse<MediaRoomLeaveHistoryRow>>("/media-room/employee/leave/history", { status }),
  });
}

export interface ApplyMediaRoomLeaveInput {
  from_date: string;
  to_date: string;
  reason?: string;
  leave_type_id?: number;
  alternate_arrangement?: string;
  is_station_leave?: boolean;
}

/** POST /media-room/employee/leave */
export function useApplyMediaRoomLeave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ApplyMediaRoomLeaveInput) => apiClient.post("/media-room/employee/leave", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media-room", "employee", "leave"] });
    },
  });
}
