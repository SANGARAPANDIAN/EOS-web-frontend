import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface MediaRoomOdHistoryRow {
  id: number;
  from_date: string;
  to_date: string;
  purpose: string | null;
  organization_visited: string | null;
  od_type: string | null;
  hod_approval_status: "pending" | "approved" | "rejected";
  hr_approval_status: "pending" | "approved" | "rejected";
  principal_approval_status: "pending" | "approved" | "rejected" | null;
  verification_status: "awaiting_documents" | "under_review" | "verified";
  overall_status: "pending" | "approved" | "rejected";
  created_at: string;
}

interface ReadyResponse<T> {
  ready: boolean;
  data: T[];
}

/** GET /media-room/employee/od/history?status= */
export function useMediaRoomOdHistory(status?: "pending" | "approved" | "rejected") {
  return useQuery({
    queryKey: ["media-room", "employee", "od", "history", status],
    queryFn: () => apiClient.get<ReadyResponse<MediaRoomOdHistoryRow>>("/media-room/employee/od/history", { status }),
  });
}

export interface ApplyMediaRoomOdInput {
  from_date: string;
  to_date: string;
  purpose?: string;
  organization_visited?: string;
  od_type?: string;
}

/** POST /media-room/employee/od */
export function useApplyMediaRoomOd() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ApplyMediaRoomOdInput) => apiClient.post("/media-room/employee/od", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media-room", "employee", "od"] });
    },
  });
}
