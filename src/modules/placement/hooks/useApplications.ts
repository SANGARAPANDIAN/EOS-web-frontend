import { useQuery } from "@tanstack/react-query";
import { applicationsService } from "../services/applications.service";
import { placementKeys } from "../query-keys";

export function useApplications(driveId: number | null) {
  return useQuery({
    queryKey: placementKeys.applications.list(driveId ?? 0),
    queryFn: () => applicationsService.list(driveId!),
    enabled: driveId !== null,
  });
}
