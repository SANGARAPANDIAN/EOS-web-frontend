import { useQuery } from "@tanstack/react-query";
import { facultyService, type ListFacultyParams } from "../services/faculty.service";
import { coordinatorKeys } from "../query-keys";

export function useCoordinatorFacultyList(params: ListFacultyParams = {}) {
  return useQuery({
    queryKey: coordinatorKeys.faculty.list(params),
    queryFn: () => facultyService.list(params),
  });
}

export function useCoordinatorFacultyProfile(id: number | null) {
  return useQuery({
    queryKey: coordinatorKeys.faculty.profile(id ?? 0),
    queryFn: () => facultyService.profile(id as number),
    enabled: id != null,
  });
}

export function useCoordinatorFacultyWorkload() {
  return useQuery({
    queryKey: coordinatorKeys.faculty.workload(),
    queryFn: facultyService.workload,
  });
}
