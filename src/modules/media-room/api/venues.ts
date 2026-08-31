import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface Venue {
  id: number;
  name: string;
  location: string | null;
  capacity: number | null;
  photo_url: string | null;
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
  return useQuery({
    queryKey: ["venues", "picker"],
    // The window is computed inside queryFn, not in the hook body: reading the
    // clock during render is impure (the same rule that the useNow loop broke),
    // and it also recomputed `from`/`to` on every single render even though the
    // query key never changed.
    queryFn: () => {
      const now = Date.now();
      return apiClient.get<PaginatedResponse<Venue>>("/venues", {
        from: new Date(now).toISOString(),
        to: new Date(now + 365 * 86_400_000).toISOString(),
        limit: 100,
      });
    },
    staleTime: 10 * 60_000,
    select: (res) => res.data,
  });
}
