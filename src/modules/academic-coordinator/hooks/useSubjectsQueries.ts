import { useQuery } from "@tanstack/react-query";
import { subjectsService } from "../services/subjects.service";
import { coordinatorKeys } from "../query-keys";

export function useSubjects() {
  return useQuery({
    queryKey: coordinatorKeys.subjects(),
    queryFn: subjectsService.list,
  });
}
