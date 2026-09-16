import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface MediaRoomHrPayrollRequestRow {
  id: number;
  category: string;
  subject: string;
  description: string | null;
  attachment_url: string | null;
  status: "submitted" | "under_review" | "resolved";
  hr_assigned_name: string | null;
  resolution_note: string | null;
  resolved_at: string | null;
  created_at: string;
}

/** GET /media-room/employee/hr-payroll/requests */
export function useMediaRoomHrPayrollRequests() {
  return useQuery({
    queryKey: ["media-room", "employee", "hr-payroll", "requests"],
    queryFn: () => apiClient.get<MediaRoomHrPayrollRequestRow[]>("/media-room/employee/hr-payroll/requests"),
  });
}

export interface CreateMediaRoomHrPayrollRequestInput {
  category: string;
  subject: string;
  description?: string;
}

/** POST /media-room/employee/hr-payroll/requests */
export function useCreateMediaRoomHrPayrollRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMediaRoomHrPayrollRequestInput) =>
      apiClient.post("/media-room/employee/hr-payroll/requests", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media-room", "employee", "hr-payroll"] });
    },
  });
}
