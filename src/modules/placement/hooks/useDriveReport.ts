import { useQuery } from "@tanstack/react-query";
import { drivesService } from "../services/drives.service";
import { placementKeys } from "../query-keys";

export function useDriveReport() {
  return useQuery({
    queryKey: placementKeys.drives.report(),
    queryFn: () => drivesService.report(),
  });
}
