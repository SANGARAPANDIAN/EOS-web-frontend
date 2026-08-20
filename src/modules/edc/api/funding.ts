import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// Real backend connection — GET/POST/PATCH/DELETE /me/edc-funding
// (EdcFundingController, added this session on a real `edc_funding_records`
// table). Built specifically to match the design's Funding screen layout
// (KPI cards by source category, Distribution panel, Utilisation panel,
// Funding Records table) — the venture's own flat funding_received/
// funding_source fields could only ever support ONE number per venture
// with no utilisation tracking, so they couldn't honestly back this
// design without this new table.

export const EDC_FUNDING_SOURCE_CATEGORIES = ["College grant", "Competition prize", "External investment", "Government grant"] as const;
export const EDC_FUNDING_STATUSES = ["Verified", "In Progress", "Pending"] as const;
export type FundingSourceCategory = (typeof EDC_FUNDING_SOURCE_CATEGORIES)[number];
export type FundingStatus = (typeof EDC_FUNDING_STATUSES)[number];

export interface FundingRecordRow {
  id: number;
  student_entrepreneurship_id: number;
  venture_name: string | null;
  source_category: FundingSourceCategory;
  source_detail: string | null;
  amount: number;
  disbursed_date: string;
  utilisation_pct: number;
  status: FundingStatus;
  created_at: string;
}

export function useFundingRecords() {
  return useQuery({
    queryKey: ["edc", "funding"],
    queryFn: () => apiClient.get<FundingRecordRow[]>("/me/edc-funding"),
  });
}

export interface FundingStats {
  total_funding: number;
  college_grant: number;
  competition_prize: number;
  external_investment: number;
  disbursement_count: number;
  distribution: { category: FundingSourceCategory; count: number }[];
  utilisation: { utilised: number; committed: number; unreported: number };
}

export function useFundingStats() {
  return useQuery({
    queryKey: ["edc", "funding", "stats"],
    queryFn: () => apiClient.get<FundingStats>("/me/edc-funding/stats"),
  });
}

export interface CreateFundingRecordInput {
  student_entrepreneurship_id: number;
  source_category: FundingSourceCategory;
  source_detail?: string;
  amount: number;
  disbursed_date: string;
  utilisation_pct?: number;
  status?: FundingStatus;
}

function invalidateFunding(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["edc", "funding"] });
}

export function useCreateFundingRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateFundingRecordInput) => apiClient.post<FundingRecordRow>("/me/edc-funding", input),
    onSuccess: () => invalidateFunding(queryClient),
  });
}

export function useUpdateFundingRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: Partial<CreateFundingRecordInput> }) =>
      apiClient.patch<FundingRecordRow>(`/me/edc-funding/${id}`, input),
    onSuccess: () => invalidateFunding(queryClient),
  });
}

export function useDeleteFundingRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/me/edc-funding/${id}`),
    onSuccess: () => invalidateFunding(queryClient),
  });
}
