import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// Backend reference: EOSbackend1/src/modules/venues/venues/*.
// {controller,service}.ts — full CRUD already existed (venues +
// venue_bookings, both rich schemas), Secretary just wasn't in the
// @Roles() list on venue-bookings routes (now added). Scoping: own
// bookings only (IQAC is the "sees all" reviewer role here) — same
// self-scoped pattern as /me/purchase-requests and /me/service-requests.

export interface VenueBooking {
  purpose: string;
  booked_by: string | null;
  accommodating_strength: number | null;
  from_datetime: string;
  to_datetime: string;
}
export interface VenueAvailability {
  id: number;
  name: string;
  location: string | null;
  capacity: number | null;
  photo_url: string | null;
  is_available: boolean;
  booking: VenueBooking | null;
}
export interface VenueAvailabilityResponse {
  data: VenueAvailability[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

/** GET /venues?from=&to= — availability over a real window (defaults to
 * "next 90 days" so the venue picker shows genuine current booking state). */
export function useVenues(from: string, to: string) {
  return useQuery({
    queryKey: ["secretary", "venues", from, to],
    queryFn: () => apiClient.get<VenueAvailabilityResponse>(`/venues?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&limit=100`),
  });
}

export type VenueBookingStatus = "pending" | "approved" | "rejected" | "alternative_offered";

export interface VenueBookingRow {
  id: number;
  venue_id: number;
  purpose: string;
  from_datetime: string;
  to_datetime: string;
  accommodating_strength: number | null;
  status: VenueBookingStatus;
  reviewed_by_user_id: number | null;
  alternative_venue_id: number | null;
  created_at: string;
  venues_venue_bookings_venue_idTovenues: { id: number; name: string; location: string | null; capacity: number | null } | null;
  users_venue_bookings_booked_by_user_idTousers: { id: number; email: string } | null;
}
export interface VenueBookingsResponse {
  data: VenueBookingRow[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

/** GET /venue-bookings — Secretary sees only bookings they made. */
export function useVenueBookings(status?: VenueBookingStatus) {
  const qs = status ? `&status=${status}` : "";
  return useQuery({
    queryKey: ["secretary", "venue-bookings", status],
    queryFn: () => apiClient.get<VenueBookingsResponse>(`/venue-bookings?limit=100${qs}`),
  });
}

export interface CreateVenueBookingInput {
  venue_id: number;
  purpose: string;
  from_datetime: string;
  to_datetime: string;
  accommodating_strength?: number;
}

/** POST /venue-bookings */
export function useCreateVenueBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateVenueBookingInput) => apiClient.post("/venue-bookings", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["secretary", "venue-bookings"] }),
  });
}
