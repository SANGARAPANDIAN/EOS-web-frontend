import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { getToken } from "@/lib/auth/session";

// Real backend connection — GET /me/edc-reports/stats + /library,
// GET /me/edc-reports/venture-table (Excel/PDF export), POST /me/edc-reports/library
// (EdcReportsController, added this session). Every KPI is computed live
// from the real venture/incubation/idea data — no invented AICTE/NIRF-
// specific figures, since no such backend concept exists.

export interface EdcReportStats {
  total_ventures: number;
  ventures_beyond_idea: number;
  total_incubated: number;
  idea_conversion_rate_pct: number;
  departments_active: number;
  monthly_revenue_reported: number;
  department_breakdown: { department: string; count: number }[];
}

export function useEdcReportStats() {
  return useQuery({
    queryKey: ["edc", "reports", "stats"],
    queryFn: () => apiClient.get<EdcReportStats>("/me/edc-reports/stats"),
  });
}

export interface EdcReportLibraryRow {
  id: number;
  report_name: string;
  period_label: string;
  prepared_by_email: string | null;
  status: string;
  generated_at: string;
}

export function useEdcReportLibrary() {
  return useQuery({
    queryKey: ["edc", "reports", "library"],
    queryFn: () => apiClient.get<EdcReportLibraryRow[]>("/me/edc-reports/library"),
  });
}

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api/v1";

/** Downloads the real venture-table export (Excel or PDF) via a plain
 * fetch (apiClient has no binary-response support), then logs the
 * generation in the Report Library. */
export function useGenerateVentureReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ format, periodLabel }: { format: "excel" | "pdf"; periodLabel: string }) => {
      const token = getToken();
      const res = await fetch(`${BASE_URL.replace(/\/+$/, "")}/me/edc-reports/venture-table?format=${format}&period=${encodeURIComponent(periodLabel)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error("Failed to generate report");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `edc-venture-report.${format === "excel" ? "xlsx" : "pdf"}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      return apiClient.post<EdcReportLibraryRow>("/me/edc-reports/library", {
        report_name: "EDC Venture Report",
        period_label: periodLabel,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["edc", "reports", "library"] }),
  });
}
