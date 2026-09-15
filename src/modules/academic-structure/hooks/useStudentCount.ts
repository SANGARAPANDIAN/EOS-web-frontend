import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

interface StudentCountParams {
  department_id?: number;
  course_id?: number;
  class_id?: number;
  batch_id?: number;
}

interface StudentCountResponse {
  meta: { total: number };
}

/**
 * Reads only the total count for a given filter — asks the server for a
 * single row (`limit: 1`) instead of pulling every matching student just to
 * count them, so this stays cheap regardless of roll size.
 */
export function useStudentCount(params: StudentCountParams = {}) {
  return useQuery({
    queryKey: ["students", "count", params],
    queryFn: () => apiClient.get<StudentCountResponse>("/students", { ...params, limit: 1 }),
    select: (res) => res.meta.total,
  });
}
