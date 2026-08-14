import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { facultyKeys } from "@/modules/admin/api/faculty";

export interface FacultyMapping {
  id: number;
  academic_year: string;
  faculty: { id: number; first_name: string; last_name: string; designation: string; profile_url?: string | null };
  subject: { id: number; name: string; subject_code: string };
  class: { id: number; section: string; department: { id: number; name: string; code: string } };
}

export interface FacultyMappingListParams {
  [key: string]: string | number | undefined;
  faculty_id?: number;
  class_id?: number;
  subject_id?: number;
  academic_year?: string;
  limit?: number;
  page?: number;
}

export interface FacultyMappingListResponse {
  data: FacultyMapping[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

const BASE = "/me/faculty-mapping";

/** Per-faculty use (e.g. the quick-view drawer, the detail page's assignments section) — gated on a real faculty_id. */
export function useFacultyMappings(params: FacultyMappingListParams) {
  return useQuery({
    queryKey: facultyKeys.mappings(params),
    queryFn: () => apiClient.get<FacultyMappingListResponse>(BASE, params),
    enabled: params.faculty_id !== undefined,
  });
}

/** Module-wide Academic Assignments browse page — no faculty_id guard. */
export function useFacultyMappingsBrowse(params: FacultyMappingListParams) {
  return useQuery({
    queryKey: facultyKeys.mappings(params),
    queryFn: () => apiClient.get<FacultyMappingListResponse>(BASE, params),
  });
}
