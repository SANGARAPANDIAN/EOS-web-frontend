"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// Fee data for the Finance portal.
//
// These are the SAME real endpoints the Billing portal reads — no duplicate
// backend, no separate copy of the numbers. The Finance role was added to the
// GET routes only (method-level @Roles on
// fees-billing/{finance-overview,fee-payments}.controller.ts), so Finance can
// review fee collection but every write — recording a payment, issuing a
// receipt, editing a demand — remains Billing's. Nothing here is sample data.

const KEY = ["finance", "fees"] as const;

/* ---------------------------------------------------------------- overview */

/**
 * Shapes below mirror the live response exactly (verified against a real call,
 * not assumed): every money field arrives as a decimal STRING from Postgres
 * NUMERIC, so each is parsed with `num()` at the edge rather than being
 * treated as a number and silently producing NaN.
 */
export interface FeeExecutiveKpis {
  totalFeeDemand: string;
  totalCollected: string;
  totalOutstanding: string;
  collectionPercentage: number;
  pendingEducationLoanDD: number;
  activeFeeStructures: number;
}

export interface FeeOverview {
  executiveKPIs: FeeExecutiveKpis;
  financialAnalytics: {
    demandVsCollection: {
      totalDemand: string;
      totalCollected: string;
      totalOutstanding: string;
    };
    monthlyCollectionTrend: Array<{ month: string; totalCollected: string }>;
    departmentOutstanding: Array<{
      department: string;
      totalDemand: string;
      totalOutstanding: string;
    }>;
    paymentStatusDistribution: Array<{ status: string; count: number }>;
    collectionByPaymentMode: Array<{ mode: string; totalAmount: string; count: number }>;
  };
  operationalInsights: {
    recentPayments: Array<{
      id: number;
      student_id: number;
      student_name: string | null;
      amount_paid: string;
      payment_date: string;
      payment_mode: string | null;
      receipt_no: string;
    }>;
    topOutstandingStudents: Array<{
      student_id: number;
      student_name: string | null;
      register_number: string | null;
      total_outstanding: string;
    }>;
    concessionSummary: {
      total_concession_amount: string;
      count: number;
      settled_count: number;
      unsettled_count: number;
    };
    educationLoanDDSummary: {
      total_amount: string;
      count: number;
      received_count: number;
      cleared_count: number;
      bounced_count: number;
    };
  };
}

/** Decimal-string -> number, at the edge. Non-numeric input becomes 0. */
export function num(v: string | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** GET /finance-overview — the institution-wide fee position. */
export function useFeeOverview(batch?: string) {
  return useQuery({
    queryKey: [...KEY, "overview", batch ?? "all"],
    queryFn: () =>
      apiClient.get<FeeOverview>(`/finance-overview${batch ? `?batch=${encodeURIComponent(batch)}` : ""}`),
  });
}

/** GET /finance-overview/batches — real batch names, for the filter. */
export function useFeeBatches() {
  return useQuery({
    queryKey: [...KEY, "batches"],
    queryFn: () => apiClient.get<string[]>("/finance-overview/batches"),
  });
}

/* ---------------------------------------------------------------- students */

export interface FeeStudentRow {
  student_fee_demand_mapping_id: number;
  student_id: number;
  student_name: string | null;
  register_number: string | null;
  programme: string;
  department: string;
  batch: string;
  quota: string;
  class_id: number | null;
  fee_structure_name: string;
  academic_year: string;
  total_demand: string;
  paid_amount: string;
  outstanding_amount: string;
  due_status: "paid" | "partial" | "pending";
  last_payment_date: string | null;
}

/**
 * GET /fee-payments/dashboard — one row per demand mapping, so a student with
 * two fee structures appears twice. Grouped per student by the page below.
 */
export function useFeeStudents() {
  return useQuery({
    queryKey: [...KEY, "students"],
    queryFn: () => apiClient.get<FeeStudentRow[]>("/fee-payments/dashboard"),
  });
}

/** One student, grouped from their demand-mapping rows. */
export interface GroupedFeeStudent {
  student_id: number;
  student_name: string | null;
  register_number: string | null;
  programme: string;
  department: string;
  batch: string;
  quota: string;
  total_demand: number;
  paid_amount: number;
  outstanding_amount: number;
  due_status: "paid" | "partial" | "pending";
  last_payment_date: string | null;
  structures: number;
  rows: FeeStudentRow[];
}

/** Collapses the per-mapping rows into one row per student. */
export function groupFeeStudents(rows: FeeStudentRow[]): GroupedFeeStudent[] {
  const byStudent = new Map<number, GroupedFeeStudent>();

  for (const r of rows) {
    const demand = Number(r.total_demand) || 0;
    const paid = Number(r.paid_amount) || 0;
    const outstanding = Number(r.outstanding_amount) || 0;

    const existing = byStudent.get(r.student_id);
    if (!existing) {
      byStudent.set(r.student_id, {
        student_id: r.student_id,
        student_name: r.student_name,
        register_number: r.register_number,
        programme: r.programme,
        department: r.department,
        batch: r.batch,
        quota: r.quota,
        total_demand: demand,
        paid_amount: paid,
        outstanding_amount: outstanding,
        due_status: r.due_status,
        last_payment_date: r.last_payment_date,
        structures: 1,
        rows: [r],
      });
      continue;
    }

    existing.total_demand += demand;
    existing.paid_amount += paid;
    existing.outstanding_amount += outstanding;
    existing.structures += 1;
    existing.rows.push(r);
    // Keep the most recent payment across all of the student's structures.
    if (
      r.last_payment_date &&
      (!existing.last_payment_date || r.last_payment_date > existing.last_payment_date)
    ) {
      existing.last_payment_date = r.last_payment_date;
    }
  }

  // Recompute the status from the combined figures: a student who has cleared
  // one structure but not another is "partial" overall, not "paid".
  for (const s of byStudent.values()) {
    s.due_status =
      s.outstanding_amount <= 0 ? "paid" : s.paid_amount > 0 ? "partial" : "pending";
  }

  return [...byStudent.values()];
}

/* ------------------------------------------------------- one student's fees */

/**
 * The real shape of GET /fee-payments/students/:id/workspace, verified against
 * a live response. Identity is nested under `student_profile` and the totals
 * under `fee_summary` — reading them from the top level (as an earlier version
 * did) is what made the name render as "—" and the demand as ₹0. Per-structure
 * rows use `total_amount`, not `total_demand`.
 */
export interface FeeStudentWorkspace {
  student_profile: {
    student_id: number;
    student_name: string | null;
    register_number: string | null;
    roll_no: string | null;
    admission_no: string | null;
    student_id_no: string | null;
    programme: string | null;
    department: string | null;
    batch: string | null;
    quota: string | null;
    gender: string | null;
    status: string | null;
  };
  fee_summary: {
    total_demand: string;
    total_paid: string;
    total_outstanding: string;
    due_status: string;
  };
  demand_summary: Array<{
    student_fee_demand_mapping_id: number;
    fee_structure_id: number;
    fee_structure_name: string;
    applies_to: string | null;
    academic_year: string;
    semester: number | null;
    total_amount: string;
    paid_amount: string;
    outstanding_amount: string;
    due_status: string;
  }>;
  payment_summary: {
    payment_count: number;
    total_paid: string;
    last_payment_date: string | null;
  };
  payment_history: Array<{
    id: number;
    student_fee_demand_mapping_id: number;
    amount_paid: string;
    payment_date: string;
    payment_mode: string | null;
    receipt_no: string;
    is_partial: boolean;
    collected_by_user_id: number | null;
  }>;
  fee_concessions: Array<{
    id: number;
    student_fee_demand_mapping_id: number;
    concession_type: string | null;
    amount: string;
    reason: string | null;
    is_settled: boolean;
  }>;
  education_loan_dd: Array<{
    id: number;
    student_fee_demand_mapping_id: number;
    bank_name: string | null;
    dd_number: string | null;
    amount: string;
    dd_date: string | null;
    is_realised: boolean;
  }>;
}

/** GET /fee-payments/students/:id/workspace — everything about one student's fees. */
export function useFeeStudentWorkspace(studentId: number | null) {
  return useQuery({
    queryKey: [...KEY, "student", studentId],
    queryFn: () => apiClient.get<FeeStudentWorkspace>(`/fee-payments/students/${studentId}/workspace`),
    enabled: studentId !== null && studentId > 0,
  });
}

/**
 * Real shape of the category breakdown (verified against a live response).
 * Note there is no `amount` field: each category reports what was originally
 * demanded, what has been paid against it, and what is still outstanding.
 * Reading a non-existent `amount` is what rendered every category as zero.
 */
export interface FeeCategoryBreakdownItem {
  fee_structure_item_id: number;
  demand_category_name: string | null;
  original_amount: string;
  already_paid: string;
  outstanding_amount: string;
  status: string;
}

/** GET /student-fee-demand-mappings/:id/category-breakdown */
export function useFeeCategoryBreakdown(demandMappingId: number | null) {
  return useQuery({
    queryKey: [...KEY, "breakdown", demandMappingId],
    queryFn: () =>
      apiClient.get<FeeCategoryBreakdownItem[]>(
        `/student-fee-demand-mappings/${demandMappingId}/category-breakdown`,
      ),
    enabled: demandMappingId !== null && demandMappingId > 0,
  });
}
