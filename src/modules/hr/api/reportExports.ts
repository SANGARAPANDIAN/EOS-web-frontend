import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { hrKeys } from "./queryKeys";

/**
 * Downloadable HR reports.
 *
 * The backend renders a real .xlsx or .pdf per report — a letterheaded,
 * sectioned document with a KPI band and totals rows, not a screenshot of the
 * page. The catalogue is fetched rather than hardcoded so the UI can never
 * offer a report that has no builder behind it.
 */

export type HrReportFormat = "excel" | "pdf";

export interface HrReportCatalogueEntry {
  kind: string;
  title: string;
  group: string;
  description: string;
  /** True when the report is per-employee and cannot be built without one. */
  needs_faculty: boolean;
}

export function useHrReportCatalogue() {
  return useQuery({
    queryKey: [...hrKeys.all, "reports", "catalogue"],
    queryFn: () => apiClient.get<HrReportCatalogueEntry[]>("/hr/reports/catalogue"),
    staleTime: 10 * 60 * 1000,
  });
}

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

export interface DownloadHrReportInput {
  report: string;
  format: HrReportFormat;
  /** Financial-year start: 2026 means FY 2026-27. */
  year?: number;
  departmentId?: number;
  facultyId?: number;
}

export function useDownloadHrReport() {
  return useMutation({
    mutationFn: async (input: DownloadHrReportInput) => {
      const { blob, filename } = await apiClient.downloadBlob("/hr/reports/export", {
        report: input.report,
        format: input.format,
        year: input.year,
        department_id: input.departmentId,
        faculty_id: input.facultyId,
      });
      // The server sets Content-Disposition (and CORS exposes it), so this
      // fallback is only reached if a proxy strips the header — it still has to
      // be unique per report, or two different reports would land under one
      // name.
      const ext = input.format === "excel" ? "xlsx" : "pdf";
      saveBlob(blob, filename ?? `${input.report}.${ext}`);
      return filename;
    },
  });
}
