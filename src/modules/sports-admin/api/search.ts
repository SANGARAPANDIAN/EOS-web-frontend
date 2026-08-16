import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface SearchResult {
  section: string;
  title: string;
  sub: string;
  route: string;
}

/** GET /sports-admin/search?q= — debounce the query before passing it in. */
export function useSportsSearch(q: string) {
  return useQuery({
    queryKey: ["sports-admin", "search", q],
    queryFn: () => apiClient.get<SearchResult[]>("/sports-admin/search", { q }),
    enabled: q.trim().length >= 2,
  });
}
