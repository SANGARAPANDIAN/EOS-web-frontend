import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface SchemeRow {
  id: number;
  name: string;
  type: string | null;
  applied: number;
  awarded: number;
  value: number;
}

export interface FundingMixRow {
  type: string;
  awarded: number;
}

export interface EducationLoans {
  sanctionedFiles: number;
  sanctionedValue: number;
  underProcessFiles: number;
  underProcessValue: number;
  rejectedCount: number;
  reappliedCount: number;
  partnerBanks: string[];
  collateralFreePercent: number | null;
}

export interface HigherEducationScholarships {
  summary: {
    fundedCount: number;
    fundedPercent: number;
    totalValue: number;
    meanValuePerFunded: number | null;
  };
  schemes: SchemeRow[];
  fundingMix: FundingMixRow[];
  loans: EducationLoans;
}

/** GET /me/higher-education-scholarships */
export function useHigherEducationScholarships() {
  return useQuery({
    queryKey: ["me", "higher-education-scholarships"],
    queryFn: () => apiClient.get<HigherEducationScholarships>("/me/higher-education-scholarships"),
  });
}

export interface CreateSchemeInput {
  name: string;
  scheme_type?: string;
  applied_count?: number;
  awarded_count?: number;
  total_value?: number;
}

/** POST /me/higher-education-scholarship-schemes */
export function useCreateScheme() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSchemeInput) => apiClient.post<{ id: number }>("/me/higher-education-scholarship-schemes", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me", "higher-education-scholarships"] }),
  });
}
