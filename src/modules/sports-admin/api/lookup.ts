import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface StudentLookupResult {
  id: number;
  name: string;
  roll_no: string | null;
  register_no: string | null;
  meta: string;
}

export interface FacultyLookupResult {
  id: number;
  name: string;
  designation: string;
  meta: string;
}

/** GET /sports-admin/lookup/students?q= — matches roll no / register no / student id no / name. */
export function useStudentLookup(q: string) {
  return useQuery({
    queryKey: ["sports-admin", "lookup", "students", q],
    queryFn: () => apiClient.get<StudentLookupResult[]>("/sports-admin/lookup/students", { q }),
    enabled: q.trim().length >= 2,
  });
}

/** GET /sports-admin/lookup/faculty?q= — matches name / email. */
export function useFacultyLookup(q: string) {
  return useQuery({
    queryKey: ["sports-admin", "lookup", "faculty", q],
    queryFn: () => apiClient.get<FacultyLookupResult[]>("/sports-admin/lookup/faculty", { q }),
    enabled: q.trim().length >= 2,
  });
}
