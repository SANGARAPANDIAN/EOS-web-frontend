import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { PaginatedResponse } from "../types";

interface StudentCountParams {
  department_id?: number;
  course_id?: number;
  class_id?: number;
}

/**
 * Reads only `meta.total` for a given filter — asks the server for a single
 * row (`limit: 1`) instead of pulling every matching student just to count
 * them, so this stays cheap regardless of roll size.
 *
 * Standalone re-implementation of the source's `students` module hook of the
 * same name: the full `students` module isn't migrated here (this repo
 * already has its own, larger student-360 view under `admin`), so this only
 * borrows the one self-contained API call it actually needs.
 */
export function useStudentCount(params: StudentCountParams = {}) {
  return useQuery({
    queryKey: ["students", "count", params],
    queryFn: () => apiClient.get<PaginatedResponse<unknown>>("/students", { ...params, limit: 1 }),
    select: (res) => res.meta.total,
  });
}
