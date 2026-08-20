import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// Backend reference: GET /me/handled-classes (AssignmentsController, FACULTY,
// HOD) — the subjects/classes this faculty actually teaches (distinct from
// class_mentors advisor assignment). Powers the profile drawer's "Classes
// handled" list.

// Exact response shape confirmed from AssignmentsService.getHandledClasses —
// one row per class+subject mapping (not deduped by class).
export interface HandledClass {
  class_id: number;
  subject_id: number;
  academic_year: string;
  section: string;
  semester: number | null;
  department_name: string;
  subject_name: string;
  subject_code: string;
}

/** GET /me/handled-classes — real backend rows are NOT deduped by
 * class+subject: a faculty who has taught the same class+subject across
 * several academic years gets one row per year (confirmed in
 * AssignmentsService.getHandledClasses's own comment: one real faculty had
 * 60 such rows). The backend already orders `academic_year desc`, so
 * deduping here to the first (most recent) row per class+subject gives
 * "what I currently teach" — every consumer of this hook wants that, none
 * want a duplicate-per-year listing, and duplicate class_id/subject_id
 * combos were producing real React "duplicate key" crashes in every
 * dropdown/list built from this data. */
export function useHandledClasses() {
  return useQuery({
    queryKey: ["me", "handled-classes"],
    queryFn: async () => {
      const rows = await apiClient.get<HandledClass[]>("/me/handled-classes");
      const seen = new Set<string>();
      return rows.filter((r) => {
        const key = `${r.class_id}:${r.subject_id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    },
  });
}
