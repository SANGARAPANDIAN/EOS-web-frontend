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
  /** True only once every subject-handling faculty for this student's current subjects has signed off — see the Faculty "No Due" screen. Not independently settable here, same as the other categories. */
  academics_cleared: boolean;
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

/**
 * The only real write this screen supports — every category boolean is
 * computed live (fees/library/laboratory/hostel from real dues, academics
 * from subject-handling faculty sign-off), none is independently settable,
 * so the edit form only ever sends this one override flag.
 */
export interface NoDuePatch {
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
