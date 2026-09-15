import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { EdcEntrepreneurshipRow } from "@/modules/edc/api/entrepreneurship";

// Backend reference: src/modules/student-entrepreneurship/
// student-entrepreneurship.{controller,service}.ts — GET /me/entrepreneurship
// (MeEntrepreneurshipController, Student-only). Same full row shape the EDC
// Coordinator's own view uses (student_entrepreneurship.student_id is
// @unique, so a student has at most one venture) — null if the student has
// never registered one with the EDC.
export function useMyEntrepreneurship() {
  return useQuery({
    queryKey: ["student", "entrepreneurship", "mine"],
    queryFn: () => apiClient.get<EdcEntrepreneurshipRow | null>("/me/entrepreneurship"),
  });
}
