import { useQuery } from "@tanstack/react-query";
import { studentReportService } from "../services/student-report.service";
import { placementKeys } from "../query-keys";

export function useReportsGeneratedCount() {
  return useQuery({
    queryKey: placementKeys.reportsGeneratedCount(),
    queryFn: studentReportService.reportsGeneratedThisMonth,
  });
}
