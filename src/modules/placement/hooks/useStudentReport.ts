import { useQuery } from "@tanstack/react-query";
import { studentReportService } from "../services/student-report.service";
import { placementKeys } from "../query-keys";

export function useStudentReport(batchId?: number) {
  return useQuery({
    queryKey: placementKeys.studentReport(batchId),
    queryFn: () => studentReportService.list(batchId),
  });
}
