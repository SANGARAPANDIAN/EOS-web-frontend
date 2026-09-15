import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { AdminReportModule } from "@/modules/admin/types/reports";

export type ReportFileFormat = "pdf" | "excel";

export interface ReportColumn {
  header: string;
  key: string;
  width?: number;
}

export interface ReportTable {
  title: string;
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
}

export interface ReportFilters {
  [key: string]: string | number | undefined;
  department_id?: number;
  hostel_id?: number;
  from?: string;
  to?: string;
}

interface ReportDef {
  basePath: string;
  /** The backend silently ignores filters a report's method doesn't accept — driving the filter row off this map is what stops the UI from offering a control that quietly does nothing (same reasoning as Library's own REPORT_DEFS, which this mirrors). */
  supports: { department: boolean; hostel: boolean; dateRange: boolean };
}

/** Keyed by `${module}:${key}` — matches AdminReportEntry from modules/admin/types/reports.ts exactly. */
export const REPORT_DEFS: Record<string, ReportDef> = {
  "hostel:occupancy": { basePath: "/hostel/reports", supports: { department: false, hostel: true, dateRange: false } },
  "hostel:fee-arrears": { basePath: "/hostel/reports", supports: { department: false, hostel: true, dateRange: false } },
  "hostel:leave-audit": { basePath: "/hostel/reports", supports: { department: false, hostel: true, dateRange: true } },
  "hostel:complaint-sla": { basePath: "/hostel/reports", supports: { department: false, hostel: true, dateRange: false } },
  "library:inventory": { basePath: "/library/reports", supports: { department: true, hostel: false, dateRange: false } },
  "library:issued": { basePath: "/library/reports", supports: { department: true, hostel: false, dateRange: true } },
  "library:returned": { basePath: "/library/reports", supports: { department: true, hostel: false, dateRange: true } },
  "library:overdue": { basePath: "/library/reports", supports: { department: true, hostel: false, dateRange: false } },
  "library:no-dues-clearance": { basePath: "/library/reports", supports: { department: false, hostel: false, dateRange: false } },
  "library:accession-register": { basePath: "/library/reports", supports: { department: true, hostel: false, dateRange: false } },
  "iqac:venue-bookings": { basePath: "/iqac/reports", supports: { department: true, hostel: false, dateRange: true } },
  "iqac:student-ods": { basePath: "/iqac/reports", supports: { department: true, hostel: false, dateRange: true } },
  "iqac:faculty-ods": { basePath: "/iqac/reports", supports: { department: true, hostel: false, dateRange: true } },
};

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** GET /{module}/reports/{key} — JSON preview, the same data the PDF/Excel export renders. */
export function useReportPreview(module: AdminReportModule, key: string, filters: ReportFilters) {
  const def = REPORT_DEFS[`${module}:${key}`];
  return useQuery({
    queryKey: ["admin", "reports", "preview", module, key, filters],
    queryFn: () => apiClient.get<ReportTable>(`${def.basePath}/${key}`, filters),
    enabled: !!def,
    staleTime: 60_000,
  });
}

/** The backend generates the PDF/Excel file — this just triggers the download and saves it. */
export function useReportDownload() {
  return useMutation({
    mutationFn: async ({
      module,
      key,
      format,
      filters,
    }: {
      module: AdminReportModule;
      key: string;
      format: ReportFileFormat;
      filters: ReportFilters;
    }) => {
      const def = REPORT_DEFS[`${module}:${key}`];
      const { blob, filename } = await apiClient.downloadBlob(`${def.basePath}/${key}`, { ...filters, format });
      saveBlob(blob, filename ?? `${key}.${format === "pdf" ? "pdf" : "xlsx"}`);
    },
  });
}

export interface HostelOption {
  id: number;
  name: string;
  code: string;
}

/** GET /hostel/hostels — Admin/Warden. Populates the hostel selector the Hostel reports need (Admin has no single natural hostel scope the way a Warden's JWT auto-resolves it). Returns a plain array, no pagination. */
export function useHostelOptions() {
  return useQuery({
    queryKey: ["admin", "reports", "hostels"],
    queryFn: () => apiClient.get<HostelOption[]>("/hostel/hostels"),
  });
}
