import { useMutation, useQueryClient } from "@tanstack/react-query";
import { drivesService } from "../services/drives.service";
import { placementKeys } from "../query-keys";
import type { CreateDriveInput, DriveStatus } from "../types";

function useInvalidateDrives() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: placementKeys.drives.all() });
    queryClient.invalidateQueries({ queryKey: placementKeys.dashboard() });
  };
}

export function useCreateDrive() {
  const invalidate = useInvalidateDrives();
  return useMutation({
    mutationFn: (input: CreateDriveInput) => drivesService.create(input),
    onSuccess: invalidate,
  });
}

export function useUpdateDriveStatus() {
  const invalidate = useInvalidateDrives();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: DriveStatus }) => drivesService.updateStatus(id, status),
    onSuccess: invalidate,
  });
}
