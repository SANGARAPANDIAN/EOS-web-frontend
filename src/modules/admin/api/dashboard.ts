import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { useBatches, useDepartments } from "@/modules/admin/api/refData";
import { useStudentCount, type StudentsListResponse } from "@/modules/admin/api/students";
import type { SoaApplicationsListResponse, SoaStatus } from "@/modules/admin/api/admissions";
import { EMPLOYMENT_STATUS_TO_ENUM } from "@/modules/admin/lib/faculty-wizard-config";

/** Mirrors EOSbackend1 src/modules/fees-billing/finance-overview/dto/finance-overview-response.dto.ts */
export interface ExecutiveKpis {
  totalFeeDemand: string;
  totalCollected: string;
  totalOutstanding: string;
  collectionPercentage: number;
  pendingEducationLoanDD: number;
  activeFeeStructures: number;
}

export interface MonthlyCollectionTrendItem {
  month: string; // "YYYY-MM"
  totalCollected: string;
}

export interface DepartmentOutstandingItem {
  department: string;
  totalDemand: string;
  totalOutstanding: string;
}

export interface PaymentStatusDistributionItem {
  status: "paid" | "partial" | "pending";
  count: number;
}

export interface FinanceOverview {
  executiveKPIs: ExecutiveKpis;
  financialAnalytics: {
    demandVsCollection: { totalDemand: string; totalCollected: string; totalOutstanding: string };
    monthlyCollectionTrend: MonthlyCollectionTrendItem[];
    departmentOutstanding: DepartmentOutstandingItem[];
    paymentStatusDistribution: PaymentStatusDistributionItem[];
  };
  operationalInsights: {
    recentPayments: unknown[];
    topOutstandingStudents: unknown[];
    concessionSummary: { total_concession_amount: string; count: number; settled_count: number; unsettled_count: number };
    educationLoanDDSummary: {
      total_amount: string;
      count: number;
      received_count: number;
      cleared_count: number;
      bounced_count: number;
    };
  };
}

export interface PaginatedMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginatedMeta;
}

/** GET /finance-overview — admin only. */
export function useFinanceOverview() {
  return useQuery({
    queryKey: ["admin", "finance-overview"],
    queryFn: () => apiClient.get<FinanceOverview>("/finance-overview"),
  });
}

/**
 * GET /me/faculty — admin/hod only. Only `meta.total` is used here (a
 * headcount), so page size is kept at 1 to avoid pulling faculty rows the
 * dashboard doesn't render.
 */
export function useFacultyCount() {
  return useQuery({
    queryKey: ["admin", "faculty", "count"],
    queryFn: () => apiClient.get<Paginated<unknown>>("/me/faculty", { page: 1, limit: 1 }),
  });
}

export function useActiveStudentCount() {
  return useStudentCount({ status: "active" });
}

/**
 * Two `limit: 1` reads, one per real status — sequenced, not fired in
 * parallel. Firing per-dimension count queries in parallel against the dev
 * DB's default pg pool (10 connections) produced intermittent 500s across
 * every endpoint, not just this one — never fan these out until there's a
 * real aggregate endpoint to replace both with a single round trip.
 */
export function useStudentStatusDistribution() {
  return useQuery({
    queryKey: ["students", "status-distribution"],
    queryFn: async () => {
      const active = await apiClient.get<StudentsListResponse>("/students", { status: "active", limit: 1 });
      const inactive = await apiClient.get<StudentsListResponse>("/students", { status: "inactive", limit: 1 });
      return [
        { label: "Active", value: active.meta.total, color: "#1d47ae" },
        { label: "Inactive", value: inactive.meta.total, color: "#eaf0fb" },
      ].filter((s) => s.value > 0);
    },
  });
}

/**
 * Departments list + one `limit: 1` active-count read per department —
 * bounded by department count (small, fixed), never by roll size. Fetched
 * SEQUENTIALLY: firing all of these in parallel exhausted the dev DB's
 * connection pool and produced 500s across every endpoint on the page, not
 * just this one. A dedicated groupBy aggregate endpoint would replace this
 * with a single round trip — until then, this sequential version stands.
 */
export function useStudentsByDepartment() {
  const departments = useDepartments();
  return useQuery({
    queryKey: ["students", "by-department"],
    queryFn: async () => {
      const counted: { label: string; value: number }[] = [];
      for (const dept of departments.data ?? []) {
        const res = await apiClient.get<StudentsListResponse>("/students", {
          department_id: dept.id,
          status: "active",
          limit: 1,
        });
        counted.push({ label: dept.code, value: res.meta.total });
      }
      return counted.filter((d) => d.value > 0).sort((a, b) => b.value - a.value);
    },
    enabled: departments.data !== undefined,
  });
}

export interface AdmissionsPipelineCounts {
  applied: number;
  feesPaid: number;
  admissionConfirmed: number;
  cancelled: number;
  total: number;
}

const ADMISSIONS_STATUSES: SoaStatus[] = ["applied", "fees_paid", "admission_confirmed", "cancelled"];

/**
 * Four `limit: 1` reads, one per soa_status_enum value, sequenced like the
 * status/department breakdowns above — same dev-DB connection-pool reason.
 * The old admin console (which predates the Admissions module being fully
 * wired up) treated this as unimplemented; the endpoint is real now, so
 * this is a genuine institution figure, not a placeholder.
 */
export function useAdmissionsPipeline() {
  return useQuery({
    queryKey: ["soa-applications", "pipeline-counts"],
    queryFn: async () => {
      const counts: Record<SoaStatus, number> = { applied: 0, fees_paid: 0, admission_confirmed: 0, cancelled: 0 };
      for (const status of ADMISSIONS_STATUSES) {
        const res = await apiClient.get<SoaApplicationsListResponse>("/soa-applications", { status, limit: 1 });
        counts[status] = res.meta.total;
      }
      const result: AdmissionsPipelineCounts = {
        applied: counts.applied,
        feesPaid: counts.fees_paid,
        admissionConfirmed: counts.admission_confirmed,
        cancelled: counts.cancelled,
        total: counts.applied + counts.fees_paid + counts.admission_confirmed + counts.cancelled,
      };
      return result;
    },
  });
}

/**
 * Batches + one `limit: 1` headcount read per batch — bounded by batch
 * count (small, fixed), sequenced for the same connection-pool reason as
 * the department breakdown. Unlike that chart, this one is NOT filtered to
 * `status: "active"` — an admission batch is a fixed cohort, so the figure
 * that actually answers "how has enrolment grown intake over intake" is the
 * batch's total headcount, not just who's still active today.
 */
export function useStudentsByBatch() {
  const batches = useBatches();
  return useQuery({
    queryKey: ["students", "by-batch"],
    queryFn: async () => {
      const counted: { label: string; value: number; start_year: number }[] = [];
      for (const batch of batches.data ?? []) {
        const res = await apiClient.get<StudentsListResponse>("/students", { batch_id: batch.id, limit: 1 });
        counted.push({ label: batch.name, value: res.meta.total, start_year: batch.start_year });
      }
      return counted.filter((b) => b.value > 0).sort((a, b) => a.start_year - b.start_year);
    },
    enabled: batches.data !== undefined,
  });
}

/**
 * One `limit: 1` read per employment_status enum value — bounded by the
 * fixed 5-value enum, sequenced for the same reason as every other
 * per-dimension breakdown on this page. A real HR-style composition figure
 * (probation/confirmed/on-leave/resigned/retired), not a placeholder.
 */
export function useFacultyWorkforceComposition() {
  return useQuery({
    queryKey: ["faculty", "workforce-composition"],
    queryFn: async () => {
      const counted: { label: string; value: number }[] = [];
      for (const [label, enumValue] of Object.entries(EMPLOYMENT_STATUS_TO_ENUM)) {
        const res = await apiClient.get<Paginated<unknown>>("/me/faculty", { employment_status: enumValue, limit: 1 });
        counted.push({ label, value: res.meta.total });
      }
      return counted.filter((c) => c.value > 0);
    },
  });
}
