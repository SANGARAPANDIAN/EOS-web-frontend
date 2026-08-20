import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { placementKeys } from "./queryKeys";
import type { ApplicationStatus, OfferResponseStatus } from "./types";

export interface DriveApplication {
  id: number;
  driveId: number;
  studentId: number;
  studentIdNo: string;
  rollNo: string | null;
  /** Undefined if the student has no soa_applications record linked. */
  studentName?: string;
  /** e.g. "CSE - A" — undefined if the student has no class mapped yet. */
  classLabel?: string;
  /** Full department name (e.g. "Computer Science and Engineering") — undefined if unmapped. */
  departmentName?: string;
  status: ApplicationStatus;
  lastClearedRound: number | null;
  updatedAt: string;
  /** Only meaningful once status is "placed" — null until the officer records a response. */
  offerResponse: OfferResponseStatus | null;
  /** The actual package offered to this student — can differ from the drive's advertised packageLpa. */
  offeredPackageLpa?: number;
}

export interface CreateApplicationInput {
  studentId: number;
}

export interface ImportApplicationsResult {
  added: number;
  alreadyAdded: string[];
  notFound: string[];
}

interface BackendApplication {
  id: number;
  drive_id: number;
  student_id: number;
  status: ApplicationStatus;
  last_cleared_round: number | null;
  updated_at: string;
  offer_response: OfferResponseStatus | null;
  // Prisma Decimal fields serialize as strings over JSON, not numbers.
  offered_package_lpa: string | null;
  // Only present on the list endpoint (add/updateStatus don't include it).
  students?: {
    id: number;
    student_id_no: string;
    roll_no: string | null;
    classes: { section: string; departments: { name: string; code: string } } | null;
    // Nullable — a student's soa_application_id (the link to this) is
    // itself optional, so a student can exist with no name on file yet.
    soa_applications: { first_name: string; last_name: string | null } | null;
  };
}

interface BackendImportApplicationsResult {
  added: number;
  already_added: string[];
  not_found: string[];
}

function toApplication(a: BackendApplication): DriveApplication {
  const classes = a.students?.classes;
  const soa = a.students?.soa_applications;
  return {
    id: a.id,
    driveId: a.drive_id,
    studentId: a.student_id,
    studentIdNo: a.students?.student_id_no ?? String(a.student_id),
    rollNo: a.students?.roll_no ?? null,
    studentName: soa ? [soa.first_name, soa.last_name].filter(Boolean).join(" ") : undefined,
    classLabel: classes ? `${classes.departments.code} - ${classes.section}` : undefined,
    departmentName: classes?.departments.name,
    status: a.status,
    lastClearedRound: a.last_cleared_round,
    updatedAt: a.updated_at,
    offerResponse: a.offer_response,
    offeredPackageLpa: a.offered_package_lpa == null ? undefined : Number(a.offered_package_lpa),
  };
}

// The only endpoint that includes the `students` relation (student_id_no,
// roll_no) — add/updateStatus return the bare row, which is why every
// mutation below just invalidates this list instead of using its own
// response.
export function useApplications(driveId: number | null) {
  return useQuery({
    queryKey: placementKeys.applications.list(driveId ?? 0),
    queryFn: async () => {
      const rows = await apiClient.get<BackendApplication[]>(`/drives/${driveId}/applications`);
      return rows.map(toApplication);
    },
    enabled: driveId !== null,
  });
}

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
    mutationFn: (input: CreateApplicationInput) =>
      apiClient.post(`/drives/${driveId}/applications`, { student_id: input.studentId }),
    onSuccess: invalidate,
  });
}

// Bulk-add from an uploaded spreadsheet of student IDs/roll numbers (e.g. a
// company's shortlist) — one request instead of adding each student one at
// a time.
export function useImportApplications(driveId: number) {
  const invalidate = useInvalidateApplications(driveId);
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      const result = await apiClient.postForm<BackendImportApplicationsResult>(
        `/drives/${driveId}/applications/import`,
        form,
      );
      const mapped: ImportApplicationsResult = {
        added: result.added,
        alreadyAdded: result.already_added,
        notFound: result.not_found,
      };
      return mapped;
    },
    onSuccess: invalidate,
  });
}

export function useUpdateApplicationStatus(driveId: number) {
  const invalidate = useInvalidateApplications(driveId);
  return useMutation({
    mutationFn: ({ studentId, status }: { studentId: number; status: ApplicationStatus }) =>
      apiClient.patch(`/drives/${driveId}/applications/${studentId}`, { status }),
    onSuccess: invalidate,
  });
}

export function useRemoveApplication(driveId: number) {
  const invalidate = useInvalidateApplications(driveId);
  return useMutation({
    mutationFn: (studentId: number) => apiClient.delete(`/drives/${driveId}/applications/${studentId}`),
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
    }) => apiClient.patch(`/drives/${driveId}/applications/${studentId}`, { offer_response: offerResponse }),
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
    }) =>
      apiClient.patch(`/drives/${driveId}/applications/${studentId}`, {
        offer_response: offerResponse,
        joining_date: joiningDate,
        work_location: workLocation,
      }),
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
    }) => apiClient.patch(`/drives/${driveId}/applications/${studentId}`, { offered_package_lpa: offeredPackageLpa }),
    onSuccess: (_data, { driveId }) => {
      queryClient.invalidateQueries({ queryKey: placementKeys.applications.list(driveId) });
      queryClient.invalidateQueries({ queryKey: placementKeys.offers() });
    },
  });
}
