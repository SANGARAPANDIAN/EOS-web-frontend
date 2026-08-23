import { useQuery } from "@tanstack/react-query";
import { courseProgressService } from "../services/course-progress.service";
import { coordinatorKeys } from "../query-keys";

export function useCourseProgress() {
  return useQuery({ queryKey: coordinatorKeys.courseProgress.all(), queryFn: courseProgressService.list });
}
