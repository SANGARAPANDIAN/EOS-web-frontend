import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

/**
 * HR payroll reporting — aggregations of the real `salary_payments` and
 * `salary_divisions` records. A financial year runs April–March, and `year`
 * everywhere below is the FY's starting calendar year (2026 = FY 2026-27).
 */

export interface PayrollMonth {
  year: number;
  month: number;
  headcount: number;
  gross: number;
  net: number;
  deductions: number;
  lop_days: number;
  /** Payslips with status `processed`. */
  paid: number;
  pending: number;
}

export interface PayrollDepartment {
  department_id: number | null;
  department_name: string;
  headcount: number;
  gross: number;
  net: number;
  deductions: number;
}

export interface PayrollSummary {
  financial_year: string;
  totals: { payslips: number; gross: number; net: number; deductions: number };
  monthly: PayrollMonth[];
  by_department: PayrollDepartment[];
}

/** GET /hr/reports/payroll-summary?year= */
export function usePayrollSummary(year?: number) {
  return useQuery({
    queryKey: ["hr", "reports", "payroll-summary", year ?? "current"],
    queryFn: () => apiClient.get<PayrollSummary>("/hr/reports/payroll-summary", { year }),
  });
}

export interface PayrollYearOption {
  financial_year_start: number;
  label: string;
  payslips: number;
}

/** GET /hr/reports/annual-statement/available-years — only years with real payroll. */
export function usePayrollYears() {
  return useQuery({
    queryKey: ["hr", "reports", "payroll-years"],
    queryFn: () => apiClient.get<PayrollYearOption[]>("/hr/reports/annual-statement/available-years"),
    staleTime: 5 * 60 * 1000,
  });
}

export interface AnnualStatementMonth {
  year: number;
  month: number;
  gross: number;
  deductions: number;
  net: number;
  lop_days: number;
  lop_amount: number;
  status: string;
  paid_at: string | null;
}

export interface AnnualStatement {
  financial_year: string;
  employee: {
    faculty_id: number;
    name: string;
    staff_code: string | null;
    designation: string | null;
    department: string | null;
    email: string | null;
    date_of_joining: string | null;
  };
  totals: {
    months_paid: number;
    months_recorded: number;
    gross: number;
    deductions: number;
    net: number;
  };
  months: AnnualStatementMonth[];
  components: { name: string; amount: number; effective_from: string }[];
  /** Server-supplied: says plainly that this is not a statutory Form 16. */
  disclaimer: string;
}

/** GET /hr/reports/annual-statement?faculty_id=&year= */
export function useAnnualStatement(facultyId: number | null, year?: number) {
  return useQuery({
    queryKey: ["hr", "reports", "annual-statement", facultyId, year ?? "current"],
    queryFn: () =>
      apiClient.get<AnnualStatement>("/hr/reports/annual-statement", {
        faculty_id: facultyId ?? undefined,
        year,
      }),
    enabled: facultyId != null,
  });
}
