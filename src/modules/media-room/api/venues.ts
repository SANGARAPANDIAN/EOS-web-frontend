import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface Venue {
  id: number;
  name: string;
  location: string | null;
  capacity: number | null;
}

interface PaginatedResponse<T> {
  data: T[];
}

/**
 * GET /venues?from=&to= — real endpoint's actual purpose is an availability
 * check for a booking window, so from/to are required even though this
 * hook only wants the plain venue list for a picker. Passes a wide window
 * (today .. +1 year) to just get every venue back; availability/booking
 * fields on each row are ignored here.
 */
export function useVenues() {
  const from = new Date().toISOString();
  const to = new Date(Date.now() + 365 * 86_400_000).toISOString();
  return useQuery({
    queryKey: ["venues", "picker"],
    queryFn: () => apiClient.get<PaginatedResponse<Venue>>("/venues", { from, to, limit: 100 }),
    staleTime: 10 * 60_000,
    select: (res) => res.data,
  });
}
