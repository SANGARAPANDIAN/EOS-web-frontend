import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// Backend reference: EOSbackend1/src/modules/venues/venues/*.
// GET /venues technically exists to check availability over a time window,
// but for this admin catalog we just want every venue, so a wide (today ..
// +5 years) window is passed and the per-venue booking/is_available fields
// are ignored.
export interface AdminVenue {
  id: number;
  name: string;
  location: string | null;
  capacity: number | null;
  photo_url: string | null;
}
interface PaginatedResponse<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface CreateVenueInput {
  name: string;
  location?: string;
  capacity?: number;
}

export type UpdateVenueInput = Partial<CreateVenueInput>;

/** POST /venues (Admin only) — real CreateVenueDto: name required, location/capacity optional. */
export function useCreateVenue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateVenueInput) => apiClient.post<AdminVenue>("/venues", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "venues"] }),
  });
}

/**
 * PATCH /venues/:id (Admin only) — real UpdateVenueDto (PartialType of
 * CreateVenueDto). Every other module reads venues through this same
 * GET /venues response, so an edit here reflects everywhere (Secretary,
 * HoD, Faculty booking) the moment this query is invalidated — no
 * separate propagation step needed.
 */
export function useUpdateVenue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateVenueInput & { id: number }) => apiClient.patch<AdminVenue>(`/venues/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "venues"] }),
  });
}

export function useAdminVenues() {
  return useQuery({
    queryKey: ["admin", "venues"],
    queryFn: () => {
      const now = new Date();
      const farOut = new Date(now);
      farOut.setFullYear(farOut.getFullYear() + 5);
      return apiClient.get<PaginatedResponse<AdminVenue>>("/venues", {
        from: now.toISOString(),
        to: farOut.toISOString(),
        limit: 100,
      });
    },
    select: (res) => res.data,
  });
}

/** POST /venues/:id/photo (multipart) */
export function useUploadVenuePhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) => {
      const formData = new FormData();
      formData.append("file", file);
      return apiClient.uploadFile<{ photo_url: string; photo_uploaded_at: string }>(`/venues/${id}/photo`, formData);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "venues"] }),
  });
}

/** DELETE /venues/:id/photo */
export function useDeleteVenuePhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.delete<{ photo_url: string | null; photo_uploaded_at: string | null }>(`/venues/${id}/photo`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "venues"] }),
  });
}
