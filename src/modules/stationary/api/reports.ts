import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// Backend reference: EOSbackend1/src/modules/stationary/stationary-vendor.controller.ts
// (reports/usage-by-department, reports/revenue) + stationary.service.ts.
// Both default to month-to-date when `from`/`to` are omitted.

export interface DepartmentUsageRow {
  department: string;
  jobs: number;
  pages: number;
  amount: number;
}

export interface UsageByDepartmentReport {
  range: { start: string; end: string };
  departments: DepartmentUsageRow[];
}

export interface ReportDateRange {
  from?: string;
  to?: string;
}

export function useUsageByDepartment(range?: ReportDateRange) {
  return useQuery({
    queryKey: ["stationary", "reports", "usage-by-department", range?.from ?? null, range?.to ?? null],
    queryFn: () =>
      apiClient.get<UsageByDepartmentReport>(
        "/stationary-requests/reports/usage-by-department",
        range?.from && range?.to ? { from: range.from, to: range.to } : undefined,
      ),
  });
}

export interface RecentPaymentRow {
  date: string;
  who: string;
  mode: string;
  jobs: number;
  amount: number;
}

export interface RevenueReport {
  range: { start: string; end: string };
  collected_this_month: number;
  collected_today: number;
  jobs_today: number;
  avg_job_value: number;
  by_mode: { mode: string; amount: number }[];
  recent_payments: RecentPaymentRow[];
}

export function useRevenueReport(range?: ReportDateRange) {
  return useQuery({
    queryKey: ["stationary", "reports", "revenue", range?.from ?? null, range?.to ?? null],
    queryFn: () =>
      apiClient.get<RevenueReport>(
        "/stationary-requests/reports/revenue",
        range?.from && range?.to ? { from: range.from, to: range.to } : undefined,
      ),
  });
}
