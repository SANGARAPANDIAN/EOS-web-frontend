import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "../services/dashboard.service";
import { placementKeys } from "../query-keys";

export function useDashboardSummary() {
  return useQuery({
    queryKey: placementKeys.dashboard(),
    queryFn: dashboardService.summary,
  });
}
