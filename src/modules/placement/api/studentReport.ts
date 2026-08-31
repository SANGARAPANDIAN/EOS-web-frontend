import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { saveBlob } from "@/modules/placement/lib/download-file";
import { placementKeys } from "./queryKeys";
import type { ApplicationStatus } from "./types";

export type ReportExportFormat = "pdf" | "excel";

// One row per student in the full roster, joined with their best placement
// application (if any) — powers the Student Reports view. `status`/
// `lastClearedRound` are null when the student never applied to any drive.
export interface StudentReportRow {
  id: number;
  studentIdNo: string;
  rollNo: string | null;
  registerNo: string | null;
  name?: string;
  classLabel?: string;
  departmentName?: string;
  departmentCode?: string;
  /** I-IV, derived from the real current_semester — null if the student has no class assignment yet. */
  year: number | null;
  drivesApplied: number;
  /** Real count of applications that reached an offer (placed or a recorded offer_response). */
  offersCount: number;
  status: ApplicationStatus | null;
  lastClearedRound: number | null;
  companyName?: string;
  /** Real once query.md #17 runs (`students` gets the column) — null ("not yet assessed") until then; officer-set, never computed. */
  placementEligible: boolean | null;
  /** Real once query.md #17 runs — false until the officer marks it, never inferred. */
  placementOptedOut: boolean;
}

export type UpdatePlacementStatusInput = Partial<{
  placementEligible: boolean;
  placementOptedOut: boolean;
}>;

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

// One request — the backend joins the full roster with every application in
// memory (DrivesService.getStudentReport) rather than one request per
// student. Exported as a plain function too, for on-demand use (e.g.
// building a client-side PDF) outside a component's query lifecycle.
export async function fetchStudentReport(batchId?: number): Promise<StudentReportRow[]> {
  const rows = await apiClient.get<BackendStudentReportRow[]>("/drives/student-report", { batch_id: batchId });
  return rows.map(toRow);
}

export function useStudentReport(batchId?: number) {
  return useQuery({
    queryKey: placementKeys.studentReport(batchId),
    queryFn: () => fetchStudentReport(batchId),
  });
}

function fallbackFilename(format: ReportExportFormat, classLabel?: string): string {
  const isoDate = new Date().toISOString().slice(0, 10);
  const scope = classLabel ? classLabel.replace(/\s+/g, "-") : "all";
  return `student-report-${scope}-${isoDate}.${format === "excel" ? "xlsx" : "pdf"}`;
}

interface DownloadArgs {
  format: ReportExportFormat;
  batchId?: number;
  classLabel?: string;
}

// A mutation, not a query — a download is a one-shot side effect with no
// cacheable result. Same batch/class filter the page is showing gets baked
// into the export, so the downloaded file matches what's on screen.
export function useStudentReportDownload() {
  return useMutation({
    mutationFn: async ({ format, batchId, classLabel }: DownloadArgs) => {
      const { blob, filename } = await apiClient.downloadBlob("/drives/student-report/export", {
        format,
        batch_id: batchId,
        class: classLabel,
      });
      saveBlob(blob, filename ?? fallbackFilename(format, classLabel));
    },
  });
}

// Real count of audit_logs rows written by the two /drives export routes
// since the start of the current month — not an estimate.
export function useReportsGeneratedCount() {
  return useQuery({
    queryKey: placementKeys.reportsGeneratedCount(),
    queryFn: async () => (await apiClient.get<{ count: number }>("/drives/reports/generated-count")).count,
  });
}

// Officer-recorded, never computed — eligibility/opt-out can't be honestly
// derived from existing data. Throws a clear ApiError (FEATURE_NOT_ENABLED)
// until the backing migration runs.
export function useUpdatePlacementStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ studentId, input }: { studentId: number; input: UpdatePlacementStatusInput }) =>
      apiClient.patch<{ id: number; placement_eligible: boolean | null; placement_opted_out: boolean }>(
        `/drives/students/${studentId}/placement-status`,
        {
          placement_eligible: input.placementEligible,
          placement_opted_out: input.placementOptedOut,
        },
      ),
    onSuccess: () => {
      // Partial key (no batchId suffix) so every batch-filtered variant of
      // the student report invalidates, not just the "all batches" one.
      queryClient.invalidateQueries({ queryKey: [...placementKeys.all, "student-report"] });
    },
  });
}
