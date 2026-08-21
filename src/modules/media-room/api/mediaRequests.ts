import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export type MediaRequestStatus = "pending" | "approved" | "rejected" | "delivered";

export interface MediaRequest {
  id: number;
  description: string;
  status: MediaRequestStatus;
  media_file_url: string | null;
  created_at: string;
  event_name: string | null;
  event_date: string | null;
  venue: { id: number; name: string; location: string | null } | null;
  coordinator_name: string | null;
  contact_number: string | null;
  media_types: string[];
  faculty: { id: number; first_name: string; last_name: string; designation: string | null } | null;
  requested_by: { id: number; name: string };
}

interface PaginatedResponse<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

/** GET /me/media-requests?status=&limit=&page= — Media Room sees every request. */
export function useMediaRequests(status?: MediaRequestStatus, limit = 100) {
  return useQuery({
    queryKey: ["me", "media-requests", status ?? "all", limit],
    queryFn: () => apiClient.get<PaginatedResponse<MediaRequest>>("/me/media-requests", { status, limit }),
    refetchInterval: 60_000,
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

/** POST /me/media-requests — "Internal request" raised by Media Room itself, same create path Secretary uses (no faculty profile needed). */
export function useCreateMediaRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMediaRequestInput) => apiClient.post<MediaRequest>("/me/media-requests", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me", "media-requests"] }),
  });
}

export interface ReviewMediaRequestInput {
  id: number;
  status: "approved" | "rejected" | "delivered";
  media_file_url?: string;
}

/** PATCH /me/media-requests/:id — Media Room only. */
export function useReviewMediaRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, media_file_url }: ReviewMediaRequestInput) =>
      apiClient.patch<MediaRequest>(`/me/media-requests/${id}`, { status, media_file_url }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me", "media-requests"] }),
  });
}
