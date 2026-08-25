import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

/**
 * Placement report exports.
 *
 * Two export endpoints exist and both produce a real file — a class or
 * department placement summary, and a student-wise report — in PDF or Excel.
 * Each export is written to audit_logs server-side, which is what the
 * "Generated this month" tile counts, so a download here is genuinely
 * reflected in that number.
 */

export type ReportFormat = "pdf" | "excel";

/** Saves a returned blob under the filename the server supplied. */
function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoking immediately can cancel the download in some browsers; a short
  // delay is the usual guard.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface ExportPlacementSummaryInput {
  batchId?: number;
  view?: "class" | "department";
  department?: string;
  format: ReportFormat;
}

/** GET /drives/reports/export — class- or department-wise placement summary. */
export function useExportPlacementSummary() {
  return useMutation({
    mutationFn: async (input: ExportPlacementSummaryInput) => {
      const { blob, filename } = await apiClient.downloadBlob("/drives/reports/export", {
        batch_id: input.batchId,
        view: input.view ?? "class",
        department: input.department,
        format: input.format,
      });
      // The fallback name must distinguish the two views. Both used to fall back
      // to the same "placement-summary", so a class export and a department
      // export landed as one filename plus a browser "(1)" copy.
      const view = input.view ?? "class";
      const ext = input.format === "excel" ? "xlsx" : "pdf";
      saveBlob(blob, filename ?? `${view}-wise-placement-report.${ext}`);
      return filename;
    },
  });
}

export interface ExportStudentReportInput {
  batchId?: number;
  className?: string;
  format: ReportFormat;
}

/** GET /drives/student-report/export — student-wise placement report. */
export function useExportStudentReport() {
  return useMutation({
    mutationFn: async (input: ExportStudentReportInput) => {
      const { blob, filename } = await apiClient.downloadBlob("/drives/student-report/export", {
        batch_id: input.batchId,
        class: input.className,
        format: input.format,
      });
      saveBlob(blob, filename ?? `student-placement-report.${input.format === "excel" ? "xlsx" : "pdf"}`);
      return filename;
    },
  });
}
