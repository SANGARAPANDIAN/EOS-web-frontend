import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface HodAssignFacultyClass {
  class_id: number;
  short_label: string;
  label: string;
}

export interface HodAssignFacultyRow {
  subject_id: number;
  subject_name: string;
  subject_code: string;
  hours_per_week: number | null;
  mapping_id: number | null;
  handling_faculty_id: number | null;
  handling_faculty_name: string | null;
  substitute_faculty_id: number | null;
  substitute_faculty_name: string | null;
  status: "assigned" | "unassigned";
}

export interface HodAssignFacultyOverview {
  classes: HodAssignFacultyClass[];
  selected_class_id: number | null;
  selected_class_label: string | null;
  faculty_options: { faculty_id: number; name: string }[];
  rows: HodAssignFacultyRow[];
}

/** GET /hod/assign-faculty?class_id= */
export function useHodAssignFaculty(classId: number | null) {
  return useQuery({
    queryKey: ["hod", "assign-faculty", classId],
    queryFn: () =>
      apiClient.get<HodAssignFacultyOverview>("/hod/assign-faculty", {
        class_id: classId ?? undefined,
      }),
  });
}

/** PATCH /hod/assign-faculty/handling-faculty */
export function useSetHandlingFaculty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { class_id: number; subject_id: number; faculty_id: number }) =>
      apiClient.patch("/hod/assign-faculty/handling-faculty", body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hod", "assign-faculty"] }),
  });
}

/** PATCH /hod/assign-faculty/substitute-faculty — faculty_id: null clears the substitute. */
export function useSetSubstituteFaculty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { class_id: number; subject_id: number; faculty_id: number | null }) =>
      apiClient.patch("/hod/assign-faculty/substitute-faculty", body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hod", "assign-faculty"] }),
  });
}
