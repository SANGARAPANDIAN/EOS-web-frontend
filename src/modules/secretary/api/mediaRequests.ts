import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// Backend reference: EOSbackend1/src/modules/faculty/media-requests/*.
// {controller,service}.ts — real `media_requests` table already existed,
// richer than the original DTO (event_name/event_date/venue_id/
// coordinator_name/contact_number/media_types were real unused columns —
// extended the DTO/service to accept them, no migration). Secretary added
// to the role guards; the service previously required a `faculty` table
// row for every caller (Secretary has none) — added a distinct Secretary
// branch that skips that lookup and scopes by `requested_by_user_id`
// directly instead (own requests only, same posture as POP/SOP/Venue).
//
// Status enum mismatch (never faked): the real enum is
// pending/approved/rejected/delivered — there is no "Published"/
// "In progress" value. Mapped to the closest real meaning: delivered →
// "Delivered" (the media room has actually shared the file back).

export type MediaRequestStatus = "pending" | "approved" | "rejected" | "delivered";

export interface MediaRequestRow {
  id: number;
  description: string;
  status: MediaRequestStatus;
  media_file_url: string | null;
  created_at: string;
  event_name: string | null;
  event_date: string | null;
  coordinator_name: string | null;
  contact_number: string | null;
  media_types: string[];
  faculty: { id: number; first_name: string; last_name: string; designation: string } | null;
  venue: { id: number; name: string; location: string | null } | null;
}
export interface MediaRequestsResponse {
  data: MediaRequestRow[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

/** GET /me/media-requests — Secretary sees only requests they raised. */
export function useMediaRequests(status?: MediaRequestStatus) {
  const qs = status ? `&status=${status}` : "";
  return useQuery({
    queryKey: ["secretary", "media-requests", status],
    queryFn: () => apiClient.get<MediaRequestsResponse>(`/me/media-requests?limit=100${qs}`),
  });
}

export interface CreateMediaRequestInput {
  description: string;
  event_name?: string;
  event_date?: string;
  venue_id?: number;
  coordinator_name?: string;
  contact_number?: string;
  media_types?: string[];
}

/** POST /me/media-requests */
export function useCreateMediaRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMediaRequestInput) => apiClient.post("/me/media-requests", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["secretary", "media-requests"] }),
  });
}

/** DELETE /me/media-requests/:id — only while still 'pending'. */
export function useDeleteMediaRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/me/media-requests/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["secretary", "media-requests"] }),
  });
}
