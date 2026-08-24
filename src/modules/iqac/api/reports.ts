import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface ScorecardRow {
  domain: string;
  key: string;
  name: string;
  path: string;
  value: number | null;
  unit: "%" | "count" | null;
  target: number | null;
  attainment: number | null;
  note: string | null;
}

export interface Scorecard {
  rows: ScorecardRow[];
  kpi_score: number | null;
}

/** GET /iqac/reports/scorecard — flattens every real metric already built across the 4 Quality domains. */
export function useScorecard() {
  return useQuery({
    queryKey: ["iqac", "reports", "scorecard"],
    queryFn: () => apiClient.get<Scorecard>("/iqac/reports/scorecard"),
  });
}

export type DownloadReportKey = "venue-bookings" | "student-ods" | "faculty-ods";
export type DownloadReportFormat = "excel" | "pdf";

export const DOWNLOAD_REPORT_DEFS: { key: DownloadReportKey; label: string; description: string }[] = [
  { key: "venue-bookings", label: "Venue bookings", description: "Every real venue booking, with requester, department and status." },
  { key: "student-ods", label: "Student on-duty requests", description: "Real student OD requests, with mentor and verification status." },
  { key: "faculty-ods", label: "Faculty on-duty requests", description: "Real faculty OD requests, with HoD/HR and verification status." },
];

export interface DownloadFilters {
  from?: string;
  to?: string;
  department_id?: number;
}

/** GET /iqac/reports/{key}?format=excel|pdf — the backend generates the file; this triggers and saves the download. */
export function useDownloadReport() {
  return useMutation({
    mutationFn: async ({ key, format, filters }: { key: DownloadReportKey; format: DownloadReportFormat; filters: DownloadFilters }) => {
      const { blob, filename } = await apiClient.downloadBlob(`/iqac/reports/${key}`, { ...filters, format });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename ?? `${key}.${format === "pdf" ? "pdf" : "xlsx"}`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    },
  });
}
