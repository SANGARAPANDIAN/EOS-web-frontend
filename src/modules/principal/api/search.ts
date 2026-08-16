import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface SearchStudentResult {
  id: number;
  name: string;
  register_no: string | null;
  department_code: string | null;
}

export interface SearchFacultyResult {
  id: number;
  name: string;
  designation: string;
  department_code: string | null;
}

export interface SearchDepartmentResult {
  id: number;
  name: string;
  code: string;
}

export interface SearchApprovalResult {
  kind: "leave" | "od";
  id: number;
  faculty_name: string;
  summary: string;
  status: string;
}

export interface SearchAnnouncementResult {
  id: number;
  title: string;
}

export interface UniversalSearchResults {
  students: SearchStudentResult[];
  faculty: SearchFacultyResult[];
  departments: SearchDepartmentResult[];
  approvals: SearchApprovalResult[];
  announcements: SearchAnnouncementResult[];
}

/** GET /me/principal/search?q= — only fires once the query is at least 2 characters. */
export function useUniversalSearch(q: string) {
  const trimmed = q.trim();
  return useQuery({
    queryKey: ["me", "principal", "search", trimmed],
    queryFn: () => apiClient.get<UniversalSearchResults>("/me/principal/search", { q: trimmed }),
    enabled: trimmed.length >= 2,
  });
}
