import { useQuery } from "@tanstack/react-query";
import { attendanceService } from "../services/attendance.service";
import { coordinatorKeys } from "../query-keys";

export function useClassAttendance(classId: number | null) {
  return useQuery({
    queryKey: coordinatorKeys.attendance.class(classId ?? 0),
    queryFn: () => attendanceService.classAttendance(classId as number),
    enabled: classId != null,
  });
}
