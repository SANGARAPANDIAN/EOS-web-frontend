import { useQuery } from "@tanstack/react-query";
import { studentsService } from "../services/students.service";
import { placementKeys } from "../query-keys";

// The roster doesn't change minute-to-minute, so a longer staleTime avoids
// re-paginating the full /student-profiles list on every focus.
export function useEligibleStudents() {
  return useQuery({
    queryKey: placementKeys.students(),
    queryFn: () => studentsService.listAll(),
    staleTime: 5 * 60 * 1000,
  });
}
