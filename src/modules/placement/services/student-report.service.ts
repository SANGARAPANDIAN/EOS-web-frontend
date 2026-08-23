import { apiClient, type BlobResponse } from "@/lib/api/client";
import type { ApplicationStatus, ReportExportFormat, StudentReportRow, UpdatePlacementStatusInput } from "../types";

interface BackendStudentReportRow {
  id: number;
  student_id_no: string;
  roll_no: string | null;
  register_no: string | null;
  name: string | null;
  class_label: string | null;
  department_name: string | null;
  department_code: string | null;
  year: number | null;
  drives_applied: number;
  offers_count: number;
  status: ApplicationStatus | null;
  last_cleared_round: number | null;
  company_name: string | null;
  placement_eligible: boolean | null;
  placement_opted_out: boolean;
}

function toRow(r: BackendStudentReportRow): StudentReportRow {
  return {
    id: r.id,
    studentIdNo: r.student_id_no,
    rollNo: r.roll_no,
    registerNo: r.register_no,
    name: r.name ?? undefined,
    classLabel: r.class_label ?? undefined,
    departmentName: r.department_name ?? undefined,
    departmentCode: r.department_code ?? undefined,
    year: r.year,
    drivesApplied: r.drives_applied,
    offersCount: r.offers_count,
    status: r.status,
    lastClearedRound: r.last_cleared_round,
    companyName: r.company_name ?? undefined,
    placementEligible: r.placement_eligible,
    placementOptedOut: r.placement_opted_out,
  };
}

export const studentReportService = {
  // One request — the backend joins the full roster with every application
  // in memory (see DrivesService.getStudentReport) rather than one request
  // per student.
  async list(batchId?: number): Promise<StudentReportRow[]> {
    const rows = await apiClient.get<BackendStudentReportRow[]>("/drives/student-report", { batch_id: batchId });
    return rows.map(toRow);
  },

  // Same batch/class filter the page is showing gets baked into the
  // export, so the downloaded file matches what's on screen.
  download(format: ReportExportFormat, batchId?: number, classLabel?: string): Promise<BlobResponse> {
    return apiClient.downloadBlob("/drives/student-report/export", { format, batch_id: batchId, class: classLabel });
  },

  // Real count of audit_logs rows written by the two /drives export
  // routes since the start of the current month — not an estimate.
  async reportsGeneratedThisMonth(): Promise<number> {
    const res = await apiClient.get<{ count: number }>("/drives/reports/generated-count");
    return res.count;
  },

  // Officer-recorded, never computed — see query.md #17 for why eligibility/
  // opt-out can't be honestly derived from existing data. Throws a clear
  // ApiError (FEATURE_NOT_ENABLED) until that migration runs.
  updatePlacementStatus(studentId: number, input: UpdatePlacementStatusInput) {
    return apiClient.patch<{ id: number; placement_eligible: boolean | null; placement_opted_out: boolean }>(
      `/drives/students/${studentId}/placement-status`,
      {
        placement_eligible: input.placementEligible,
        placement_opted_out: input.placementOptedOut,
      },
    );
  },
};
