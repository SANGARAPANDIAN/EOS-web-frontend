import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface MediaRoomPayslipHistoryRow {
  id: number;
  month: string;
  status: "pending" | "processed" | "rejected";
  file_url: string | null;
  requested_at: string;
  purpose: string | null;
}

interface ReadyResponse<T> {
  ready: boolean;
  data: T[];
}

/** GET /media-room/employee/payslip/history */
export function useMediaRoomPayslipHistory() {
  return useQuery({
    queryKey: ["media-room", "employee", "payslip", "history"],
    queryFn: () => apiClient.get<ReadyResponse<MediaRoomPayslipHistoryRow>>("/media-room/employee/payslip/history"),
  });
}

export interface ApplyMediaRoomPayslipInput {
  month: string;
  purpose?: string;
}

/** POST /media-room/employee/payslip */
export function useApplyMediaRoomPayslip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ApplyMediaRoomPayslipInput) => apiClient.post("/media-room/employee/payslip", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media-room", "employee", "payslip"] });
    },
  });
}
