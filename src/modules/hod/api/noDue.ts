import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface HodNoDueClass {
  class_id: number;
  section: string;
  semester: number;
  year_label: string;
}

/** GET /hod/no-due/classes */
export function useHodNoDueClasses() {
  return useQuery({
    queryKey: ["hod", "no-due", "classes"],
    queryFn: () => apiClient.get<HodNoDueClass[]>("/hod/no-due/classes"),
  });
}

export interface HodNoDueRow {
  student_id: number;
  student_id_no: string;
  name: string | null;
  class_label: string;
  library_cleared: boolean;
  laboratory_cleared: boolean;
  fees_cleared: boolean;
  hostel_cleared: boolean;
  sports_cleared: boolean;
  issued: boolean;
}

export interface HodNoDueList {
  department: { id: number; name: string; code: string };
  class: { id: number; label: string };
  counts: { in_scope: number; issued: number; pending: number };
  rows: HodNoDueRow[];
}

/** GET /hod/no-due?class_id=&search= */
export function useHodNoDueList(classId: number | null, search: string) {
  return useQuery({
    queryKey: ["hod", "no-due", "list", classId, search],
    queryFn: () =>
      apiClient.get<HodNoDueList>("/hod/no-due", {
        class_id: classId ?? undefined,
        search: search || undefined,
      }),
    enabled: classId !== null,
  });
}

export interface NoDuePatch {
  library_cleared?: boolean;
  laboratory_cleared?: boolean;
  fees_cleared?: boolean;
  hostel_cleared?: boolean;
  sports_cleared?: boolean;
  issue?: boolean;
}

/** PATCH /hod/no-due/:studentId */
export function useUpdateHodNoDue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ studentId, patch }: { studentId: number; patch: NoDuePatch }) =>
      apiClient.patch(`/hod/no-due/${studentId}`, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hod", "no-due", "list"] }),
  });
}
