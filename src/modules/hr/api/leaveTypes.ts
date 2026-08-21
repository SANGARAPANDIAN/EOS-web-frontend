import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { hrKeys } from "./queryKeys";

export interface LeaveType {
  id: number;
  name: string;
  default_annual_quota: number;
}

/** GET /leave-types — reference data (managed directly in the database), shared with Faculty self-service. */
export function useLeaveTypes() {
  return useQuery({
    queryKey: hrKeys.leaveTypes(),
    queryFn: () => apiClient.get<LeaveType[]>("/leave-types"),
    staleTime: 5 * 60 * 1000,
  });
}
