import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface SubjectRow {
  id: number;
  name: string;
  subject_code: string;
  credits: number | null;
}

/**
 * GET /subjects — institution-wide subject catalogue (unfiltered, no
 * per-class scoping). Used only as an id -> credits lookup since
 * /me/exam-results doesn't include credits; cached long since subjects
 * rarely change mid-semester.
 */
export function useSubjectsLookup() {
  return useQuery({
    queryKey: ["subjects", "lookup"],
    queryFn: () => apiClient.get<SubjectRow[]>("/subjects"),
    staleTime: 30 * 60_000,
    // See departments.ts's useDepartments() for why this needs to be well
    // above staleTime — same reasoning, same reference-data tier.
    gcTime: 60 * 60_000,
  });
}
