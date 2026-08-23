import { useQuery } from "@tanstack/react-query";
import { drivesService } from "../services/drives.service";
import { placementKeys } from "../query-keys";
import type { DriveListParams } from "../types";

export function useDrives(params: DriveListParams = {}) {
  return useQuery({
    queryKey: placementKeys.drives.list(params),
    queryFn: () => drivesService.list(params),
  });
}

export function useDrive(id: number | null) {
  return useQuery({
    queryKey: placementKeys.drives.detail(id ?? 0),
    queryFn: () => drivesService.get(id!),
    enabled: id !== null,
  });
}
