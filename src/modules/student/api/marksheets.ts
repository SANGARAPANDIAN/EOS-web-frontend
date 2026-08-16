import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface MyMarksheet {
  id: number;
  exam_id: number;
  file_url: string;
  generated_at: string;
  exams: { title: string; academic_year: string; semester: number };
}

/**
 * GET /me/marksheets — every real, already-issued marksheet for the
 * student (file_url points at the actual COE-generated document; there is
 * no client-side PDF generation here, unlike the fee receipt — a marksheet
 * is an official record, not something to fabricate a look-alike of). Uses
 * the list endpoint rather than GET /me/marksheets/:examId so a semester
 * with no marksheet issued yet is just an absent entry, not a 404 to
 * special-case.
 */
export function useMyMarksheets() {
  return useQuery({
    queryKey: ["me", "marksheets"],
    queryFn: () => apiClient.get<MyMarksheet[]>("/me/marksheets"),
  });
}
