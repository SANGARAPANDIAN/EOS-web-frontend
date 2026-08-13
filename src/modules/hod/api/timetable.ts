import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface HodTimetableClass {
  class_id: number;
  short_label: string;
  label: string;
}

export interface HodTimetableSubject {
  subject_id: number;
  name: string;
  code: string;
  faculty_ids: number[];
}

export interface HodTimetableFacultyOption {
  faculty_id: number;
  name: string;
}

export interface HodTimetableColumn {
  period_number: number;
  start_time: string;
  end_time: string;
}

export type HodTimetableCell =
  | {
      period_number: number;
      type: "class" | "lab";
      slot_id: number;
      subject_id: number;
      subject_name: string;
      subject_code: string;
      faculty_id: number;
      faculty_name: string;
      venue_name: string | null;
    }
  | { period_number: number; type: "free" | "break" };

export interface HodTimetableRow {
  day_of_week: number;
  day_label: string;
  cells: HodTimetableCell[];
}

export interface HodTimetableOverview {
  classes: HodTimetableClass[];
  selected_class_id: number | null;
  selected_class_label: string | null;
  subjects: HodTimetableSubject[];
  faculty_options: HodTimetableFacultyOption[];
  columns: HodTimetableColumn[];
  rows: HodTimetableRow[];
}

/** GET /hod/timetable?class_id= */
export function useHodTimetable(classId: number | null) {
  return useQuery({
    queryKey: ["hod", "timetable", classId],
    queryFn: () =>
      apiClient.get<HodTimetableOverview>("/hod/timetable", {
        class_id: classId ?? undefined,
      }),
  });
}

/** PUT /hod/timetable/slot */
export function useSetTimetableSlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      class_id: number;
      day_of_week: number;
      period_number: number;
      subject_id: number;
      faculty_id: number;
    }) => apiClient.put("/hod/timetable/slot", body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hod", "timetable"] }),
  });
}

/** DELETE /hod/timetable/slot/:id */
export function useClearTimetableSlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (slotId: number) => apiClient.delete(`/hod/timetable/slot/${slotId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hod", "timetable"] }),
  });
}
