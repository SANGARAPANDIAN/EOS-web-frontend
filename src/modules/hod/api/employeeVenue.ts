import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

interface PaginatedResponse<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface HodVenueAvailability {
  id: number;
  name: string;
  location: string | null;
  capacity: number | null;
  is_available: boolean;
  booking: {
    purpose: string;
    booked_by: string;
    accommodating_strength: number | null;
    from_datetime: string;
    to_datetime: string;
  } | null;
}

/** GET /venues?from=&to= — the venue catalog with any conflicting booking in that window (existing, shared endpoint — HOD is already authorized). */
export function useHodVenues(from: string, to: string) {
  return useQuery({
    queryKey: ["hod", "employee", "venue", "catalog", from, to],
    queryFn: () =>
      apiClient.get<PaginatedResponse<HodVenueAvailability>>("/venues", { from, to, limit: 100 }),
  });
}

export interface HodVenueBookingRow {
  id: number;
  venue_id: number;
  venue: { id: number; name: string; location: string | null; capacity: number | null };
  purpose: string;
  description: string | null;
  from_datetime: string;
  to_datetime: string;
  accommodating_strength: number | null;
  status: "pending" | "approved" | "rejected" | "alternative_offered";
  admin_remarks: string | null;
  created_at: string;
}

/** GET /venue-bookings?status= — the existing endpoint force-scopes a HOD caller to their own submissions. */
export function useHodVenueBookings(status?: string) {
  return useQuery({
    queryKey: ["hod", "employee", "venue", "bookings", status],
    queryFn: () =>
      apiClient.get<PaginatedResponse<HodVenueBookingRow>>("/venue-bookings", {
        status,
        limit: 100,
      }),
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
export function useCreateHodVenueBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateVenueBookingInput) => apiClient.post("/venue-bookings", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hod", "employee", "venue"] });
    },
  });
}
