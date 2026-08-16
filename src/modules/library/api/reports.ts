import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { libraryKeys } from "@/modules/library/api/queryKeys";
import { saveBlob } from "@/modules/library/lib/download-file";

export type ReportKey = "inventory" | "issued" | "returned" | "overdue" | "no-dues-clearance" | "accession-register";
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
  from?: string;
  to?: string;
}

interface ReportDef {
  label: string;
  description: string;
  supports: { department: boolean; dateRange: boolean };
}

/**
 * The backend silently ignores filters a report's method doesn't accept
 * (e.g. inventory never receives from/to; no-dues-clearance takes no
 * arguments at all) — driving the filter row off this map, rather than
 * always showing department + date-range, is what stops the UI from
 * offering controls that quietly do nothing.
 */
export const REPORT_DEFS: Record<ReportKey, ReportDef> = {
  inventory: {
    label: "Inventory",
    description: "Every title with copies, rack position, cost and current availability.",
    supports: { department: true, dateRange: false },
  },
  issued: {
    label: "Issued books",
    description: "Borrowings in the selected period with student, department and due date.",
    supports: { department: true, dateRange: true },
  },
  returned: {
    label: "Returned books",
    description: "Receipts at the counter, including renewals and late returns.",
    supports: { department: true, dateRange: true },
  },
  overdue: {
    label: "Overdue books",
    description: "Copies past due, grouped by days late and by department.",
    supports: { department: true, dateRange: false },
  },
  "no-dues-clearance": {
    label: "No-dues clearance list",
    description: "Members with books or fines still pending.",
    supports: { department: false, dateRange: false },
  },
  "accession-register": {
    label: "Accession register",
    description: "The statutory register of every copy added, with fund and vendor.",
    supports: { department: true, dateRange: false },
  },
};

export const REPORT_KEYS = Object.keys(REPORT_DEFS) as ReportKey[];

const BASE = "/library/reports";

export function useReportPreview(key: ReportKey, filters: ReportFilters) {
  return useQuery({
    queryKey: libraryKeys.reports.preview(key, filters),
    queryFn: () => apiClient.get<ReportTable>(`${BASE}/${key}`, filters),
    staleTime: 60_000,
  });
}

/**
 * The backend generates the PDF/Excel file — this just triggers the
 * download and saves it. Deliberately uncached (no query key): a "download
 * report" click is an action, not something to serve from cache.
 */
export function useReportDownload() {
  return useMutation({
    mutationFn: async ({ key, format, filters }: { key: ReportKey; format: ReportFileFormat; filters: ReportFilters }) => {
      const { blob, filename } = await apiClient.downloadBlob(`${BASE}/${key}`, { ...filters, format });
      saveBlob(blob, filename ?? `${key}.${format === "pdf" ? "pdf" : "xlsx"}`);
    },
  });
}
