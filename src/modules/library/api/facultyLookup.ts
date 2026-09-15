import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { libraryKeys } from "@/modules/library/api/queryKeys";

export interface FacultySearchResult {
  id: number;
  name: string;
  designation: string | null;
  staff_code: string | null;
  email: string;
  department: { name: string; code: string } | null;
}

const BASE = "/library/faculty";

/** Typeahead — backend requires q.length >= 2, gated client-side to match. */
export function useFacultySearch(q: string) {
  const trimmed = q.trim();
  return useQuery({
    queryKey: libraryKeys.faculty.search(trimmed),
    queryFn: () => apiClient.get<FacultySearchResult[]>(`${BASE}/search`, { q: trimmed }),
    enabled: trimmed.length >= 2,
  });
}
