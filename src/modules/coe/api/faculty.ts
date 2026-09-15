import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// Read-only faculty lookup, scoped to the coe role — GET /exam-faculty-directory
// (new backend module over the existing `faculty` table; no write access).

export interface FacultyDirectoryEntry {
  id: number;
  name: string;
  designation: string;
  department_id: number;
  department_name: string;
  department_code: string;
}

export function useFacultyDirectory(params?: { department_id?: number; search?: string }) {
  return useQuery({
    queryKey: ["coe", "faculty-directory", params?.department_id ?? null, params?.search ?? ""],
    queryFn: () =>
      apiClient.get<FacultyDirectoryEntry[]>("/exam-faculty-directory", {
        ...(params?.department_id ? { department_id: params.department_id } : {}),
        ...(params?.search ? { search: params.search } : {}),
      }),
    staleTime: 60 * 1000,
  });
}
