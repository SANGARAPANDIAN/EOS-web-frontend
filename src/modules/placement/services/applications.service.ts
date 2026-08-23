import { apiClient } from "@/lib/api/client";
import type { ApplicationStatus, CreateApplicationInput, DriveApplication, OfferResponseStatus } from "../types";

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
  // Only present on the list endpoint (addApplication/updateStatus don't
  // include it) — see applicationsService.list's comment.
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

export interface ImportApplicationsResult {
  added: number;
  alreadyAdded: string[];
  notFound: string[];
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

export const applicationsService = {
  // The only endpoint that includes the `students` relation (student_id_no,
  // roll_no) — addApplication/updateStatus return the bare row, which is
  // why every mutation below just invalidates this list instead of trying
  // to use its own response.
  async list(driveId: number): Promise<DriveApplication[]> {
    const rows = await apiClient.get<BackendApplication[]>(`/drives/${driveId}/applications`);
    return rows.map(toApplication);
  },

  async add(driveId: number, input: CreateApplicationInput): Promise<void> {
    await apiClient.post(`/drives/${driveId}/applications`, { student_id: input.studentId });
  },

  // Bulk-add from an uploaded spreadsheet of student IDs/roll numbers (e.g.
  // a company's shortlist) — one request instead of adding each student
  // one at a time.
  async importFromFile(driveId: number, file: File): Promise<ImportApplicationsResult> {
    const form = new FormData();
    form.append("file", file);
    const result = await apiClient.postForm<BackendImportApplicationsResult>(`/drives/${driveId}/applications/import`, form);
    return {
      added: result.added,
      alreadyAdded: result.already_added,
      notFound: result.not_found,
    };
  },

  async updateStatus(driveId: number, studentId: number, status: ApplicationStatus): Promise<void> {
    await apiClient.patch(`/drives/${driveId}/applications/${studentId}`, { status });
  },

  async updateOfferResponse(driveId: number, studentId: number, offerResponse: OfferResponseStatus): Promise<void> {
    await apiClient.patch(`/drives/${driveId}/applications/${studentId}`, { offer_response: offerResponse });
  },

  async updateOfferedPackage(driveId: number, studentId: number, offeredPackageLpa: number): Promise<void> {
    await apiClient.patch(`/drives/${driveId}/applications/${studentId}`, { offered_package_lpa: offeredPackageLpa });
  },

  // One PATCH for the whole "Update offer status" modal — response plus the
  // real (once query.md #16 runs) joining_date/work_location fields.
  async updateOfferDetails(
    driveId: number,
    studentId: number,
    input: { offerResponse: OfferResponseStatus; joiningDate?: string; workLocation?: string },
  ): Promise<void> {
    await apiClient.patch(`/drives/${driveId}/applications/${studentId}`, {
      offer_response: input.offerResponse,
      joining_date: input.joiningDate,
      work_location: input.workLocation,
    });
  },

  async remove(driveId: number, studentId: number): Promise<void> {
    await apiClient.delete(`/drives/${driveId}/applications/${studentId}`);
  },
};
