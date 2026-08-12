import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface FinanceSummary {
  total_collection: number;
  collection_percentage_of_demand: number | null;
  outstanding_dues: number;
  students_with_dues: number;
  scholarships: { total_value: number; beneficiaries: number; tracked: boolean };
  budget: { total_spent: number; total_sanctioned: number | null; utilised_percentage: number | null };
}

/** GET /me/principal/finance/summary — oversight only, transaction-level accounting stays with the Finance office. */
export function useFinanceSummary() {
  return useQuery({
    queryKey: ["me", "principal", "finance", "summary"],
    queryFn: () => apiClient.get<FinanceSummary>("/me/principal/finance/summary"),
  });
}

export interface CollectionByYearRow {
  year: string;
  demand: number;
  collected: number;
  pending: number;
}

export function useCollectionByYear() {
  return useQuery({
    queryKey: ["me", "principal", "finance", "collection-by-year"],
    queryFn: () => apiClient.get<CollectionByYearRow[]>("/me/principal/finance/collection-by-year"),
  });
}

export interface FeeHeadRow {
  fee_head: string;
  demand: number;
  collected: number;
  balance: number;
  recovery_percentage: number | null;
}

export function useFeeHeadBreakdown() {
  return useQuery({
    queryKey: ["me", "principal", "finance", "fee-heads"],
    queryFn: () => apiClient.get<FeeHeadRow[]>("/me/principal/finance/fee-heads"),
  });
}

export interface DueByAgeRow {
  age: string;
  students: number;
  amount: number;
}

export function useDuesByAge() {
  return useQuery({
    queryKey: ["me", "principal", "finance", "dues-by-age"],
    queryFn: () => apiClient.get<DueByAgeRow[]>("/me/principal/finance/dues-by-age"),
  });
}

export interface ScholarshipSchemeRow {
  id: number;
  name: string;
  academic_year: string;
  status: string;
  beneficiaries: number;
  value: number;
}

export interface ScholarshipSchemesResponse {
  tracked: boolean;
  schemes: ScholarshipSchemeRow[];
}

/** GET /me/principal/finance/scholarships — `tracked: false` only if query.md #12 hasn't been run; once run, `schemes` may still be a real empty list until admin data entry. */
export function useScholarships() {
  return useQuery({
    queryKey: ["me", "principal", "finance", "scholarships"],
    queryFn: () => apiClient.get<ScholarshipSchemesResponse>("/me/principal/finance/scholarships"),
  });
}

export interface BudgetHeadRow {
  head: string;
  spent: number | null;
  sanctioned: number | null;
  share_of_spend: number | null;
}

export interface BudgetResponse {
  heads: BudgetHeadRow[];
  totalSpent: number;
  totalSanctioned: number | null;
  utilisedPercentage: number | null;
}

/** GET /me/principal/finance/budget — only "Salaries and benefits" spend is real until query.md #12 is run. */
export function useBudget() {
  return useQuery({
    queryKey: ["me", "principal", "finance", "budget"],
    queryFn: () => apiClient.get<BudgetResponse>("/me/principal/finance/budget"),
  });
}
