import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export type HodAttendanceStatus = "present" | "absent" | "on_duty";

export interface HodMyClassHandledClass {
  class_id: number;
  subject_id: number;
  section: string;
  subject_name: string;
  subject_code: string;
}

export interface HodMyClassAttendancePeriod {
  period_number: number;
  start_time: string;
  end_time: string;
}

export interface HodMyClassAttendanceStudent {
  student_id: number;
  student_id_no: string;
  name: string;
  status: HodAttendanceStatus | null;
}

export interface HodMyClassAttendanceOverview {
  handled_classes: HodMyClassHandledClass[];
  selected_class: HodMyClassHandledClass | null;
  date: string | null;
  periods: HodMyClassAttendancePeriod[];
  already_saved: boolean;
  students: HodMyClassAttendanceStudent[];
}

/** GET /hod/my-class/attendance?class_id=&subject_id= */
export function useHodMyClassAttendance(classId?: number, subjectId?: number) {
  return useQuery({
    queryKey: ["hod", "my-class", "attendance", classId, subjectId],
    queryFn: () =>
      apiClient.get<HodMyClassAttendanceOverview>("/hod/my-class/attendance", {
        class_id: classId,
        subject_id: subjectId,
      }),
  });
}

export interface MarkHodMyClassAttendanceInput {
  class_id: number;
  subject_id: number;
  records: { student_id: number; status: HodAttendanceStatus }[];
}

/** POST /hod/my-class/attendance/mark */
export function useMarkHodMyClassAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: MarkHodMyClassAttendanceInput) => apiClient.post("/hod/my-class/attendance/mark", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hod", "my-class", "attendance"] }),
  });
}
