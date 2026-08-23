import { useQuery } from "@tanstack/react-query";
import { studentsService } from "../services/students.service";
import { placementKeys } from "../query-keys";

export function useStudentProfile(id: number | null) {
  return useQuery({
    queryKey: placementKeys.studentProfile(id ?? 0),
    queryFn: () => studentsService.getProfile(id!),
    enabled: id !== null,
  });
}
