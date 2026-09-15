import { useQuery } from "@tanstack/react-query";
import { timetableService } from "../services/timetable.service";
import { coordinatorKeys } from "../query-keys";

export function useAllTimetableSlots() {
  return useQuery({
    queryKey: coordinatorKeys.timetable.all(),
    queryFn: timetableService.listAll,
    staleTime: 60 * 1000,
  });
}
