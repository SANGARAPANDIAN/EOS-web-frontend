import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export type ShootStatus = "planned" | "confirmed" | "delivered" | "cancelled";

export interface ShootAssignment {
  id: number;
  status: ShootStatus;
  crew: string | null;
  gear_issued: string | null;
  output_type: string | null;
  scheduled_at: string | null;
  created_at: string;
  media_request: {
    id: number;
    event_name: string | null;
    event_date: string | null;
    description: string;
    status: string;
    venues: { name: string } | null;
  } | null;
  /** Set only for standalone entries (Academic Calendar's "Add media event") — mutually exclusive with media_request. */
  event_title: string | null;
  venue: string | null;
  assigned_to: { id: number; full_name: string } | null;
}

interface ReadyResponse<T> {
  ready: boolean;
  data: T[];
}

/** GET /me/media-shoot-assignments — ready:false until the media_shoot_assignments table exists. */
export function useShootAssignments() {
  return useQuery({
    queryKey: ["media-room", "shoots"],
    queryFn: () => apiClient.get<ReadyResponse<ShootAssignment>>("/me/media-shoot-assignments"),
    refetchInterval: 60_000,
  });
}

/** Exactly one of media_request_id / event_title must be set — matches the DB's media_shoot_assignments_source_check constraint. */
export type CreateShootAssignmentInput = { assigned_to_member_id?: number; crew?: string; gear_issued?: string; output_type?: string; scheduled_at?: string } & (
  | { media_request_id: number; event_title?: undefined; venue?: undefined }
  | { media_request_id?: undefined; event_title: string; venue?: string }
);

export function useCreateShootAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateShootAssignmentInput) => apiClient.post<ShootAssignment>("/me/media-shoot-assignments", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["media-room", "shoots"] }),
  });
}

export interface UpdateShootAssignmentInput {
  id: number;
  assigned_to_member_id?: number;
  crew?: string;
  gear_issued?: string;
  output_type?: string;
  scheduled_at?: string;
  status?: ShootStatus;
}

export function useUpdateShootAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateShootAssignmentInput) => apiClient.patch<ShootAssignment>(`/me/media-shoot-assignments/${id}`, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["media-room", "shoots"] }),
  });
}

export function useDeleteShootAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/me/media-shoot-assignments/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["media-room", "shoots"] }),
  });
}
