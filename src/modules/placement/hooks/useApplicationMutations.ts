import { useMutation, useQueryClient } from "@tanstack/react-query";
import { applicationsService } from "../services/applications.service";
import { placementKeys } from "../query-keys";
import type { ApplicationStatus, CreateApplicationInput, OfferResponseStatus } from "../types";

function useInvalidateApplications(driveId: number) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: placementKeys.applications.list(driveId) });
    queryClient.invalidateQueries({ queryKey: placementKeys.drives.all() });
  };
}

export function useAddApplication(driveId: number) {
  const invalidate = useInvalidateApplications(driveId);
  return useMutation({
    mutationFn: (input: CreateApplicationInput) => applicationsService.add(driveId, input),
    onSuccess: invalidate,
  });
}

export function useImportApplications(driveId: number) {
  const invalidate = useInvalidateApplications(driveId);
  return useMutation({
    mutationFn: (file: File) => applicationsService.importFromFile(driveId, file),
    onSuccess: invalidate,
  });
}

export function useUpdateApplicationStatus(driveId: number) {
  const invalidate = useInvalidateApplications(driveId);
  return useMutation({
    mutationFn: ({ studentId, status }: { studentId: number; status: ApplicationStatus }) =>
      applicationsService.updateStatus(driveId, studentId, status),
    onSuccess: invalidate,
  });
}

export function useRemoveApplication(driveId: number) {
  const invalidate = useInvalidateApplications(driveId);
  return useMutation({
    mutationFn: (studentId: number) => applicationsService.remove(driveId, studentId),
    onSuccess: invalidate,
  });
}

// Offers spans applications across every drive, so — unlike the hooks above —
// driveId travels with each call instead of being bound once per hook.
export function useUpdateOfferResponse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      driveId,
      studentId,
      offerResponse,
    }: {
      driveId: number;
      studentId: number;
      offerResponse: OfferResponseStatus;
    }) => applicationsService.updateOfferResponse(driveId, studentId, offerResponse),
    onSuccess: (_data, { driveId }) => {
      queryClient.invalidateQueries({ queryKey: placementKeys.applications.list(driveId) });
      queryClient.invalidateQueries({ queryKey: placementKeys.offers() });
    },
  });
}

export function useUpdateOfferDetails() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      driveId,
      studentId,
      offerResponse,
      joiningDate,
      workLocation,
    }: {
      driveId: number;
      studentId: number;
      offerResponse: OfferResponseStatus;
      joiningDate?: string;
      workLocation?: string;
    }) => applicationsService.updateOfferDetails(driveId, studentId, { offerResponse, joiningDate, workLocation }),
    onSuccess: (_data, { driveId }) => {
      queryClient.invalidateQueries({ queryKey: placementKeys.applications.list(driveId) });
      queryClient.invalidateQueries({ queryKey: placementKeys.offers() });
    },
  });
}

export function useUpdateOfferedPackage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      driveId,
      studentId,
      offeredPackageLpa,
    }: {
      driveId: number;
      studentId: number;
      offeredPackageLpa: number;
    }) => applicationsService.updateOfferedPackage(driveId, studentId, offeredPackageLpa),
    onSuccess: (_data, { driveId }) => {
      queryClient.invalidateQueries({ queryKey: placementKeys.applications.list(driveId) });
      queryClient.invalidateQueries({ queryKey: placementKeys.offers() });
    },
  });
}
