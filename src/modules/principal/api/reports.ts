import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { getToken } from "@/lib/auth/session";
import { ApiError } from "@/types/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api/v1";

export interface SummaryMetric {
  label: string;
  value: string;
  detail: string;
}

export interface PrincipalReportsSummary {
  mean_attendance: SummaryMetric;
  placement_rate: SummaryMetric;
  fee_recovery: SummaryMetric;
}

/** GET /me/principal/reports/summary — the 3 headline cards. */
export function usePrincipalReportsSummary() {
  return useQuery({
    queryKey: ["me", "principal", "reports", "summary"],
    queryFn: () => apiClient.get<PrincipalReportsSummary>("/me/principal/reports/summary"),
  });
}

export interface ScorecardRow {
  metric: string;
  this_year: string;
  last_year: string;
  target: string;
  attainment: string;
}

export interface ScorecardTable {
  title: string;
  columns: { header: string; key: string; width?: number }[];
  rows: ScorecardRow[];
}

/** GET /me/principal/reports/scorecard — the real "Institution scorecard" table. */
export function usePrincipalScorecard() {
  return useQuery({
    queryKey: ["me", "principal", "reports", "scorecard"],
    queryFn: () => apiClient.get<ScorecardTable>("/me/principal/reports/scorecard"),
  });
}

/**
 * The scorecard endpoint returns a raw xlsx/pdf (not the JSON envelope
 * apiClient expects), and a plain <a href> download wouldn't carry the
 * Bearer token — same fetch-as-blob-then-object-URL pattern as
 * student/api/feePayment.ts's downloadFeeReceipt.
 */
export async function downloadScorecard(format: "excel" | "pdf"): Promise<void> {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}/me/principal/reports/scorecard?format=${format}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(
      body ?? {
        success: false,
        statusCode: res.status,
        errorCode: "UNKNOWN_ERROR",
        message: "Could not download the report.",
        timestamp: new Date().toISOString(),
        path: "",
      },
    );
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `institution-scorecard.${format === "excel" ? "xlsx" : "pdf"}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
