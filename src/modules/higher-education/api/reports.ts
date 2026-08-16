import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface GroupSummary {
  aspirants: number;
  admits: number;
  abroad: number;
  funded: number;
  totalValue: number;
  conversionPercent: number;
}

export interface ProgressionRow extends GroupSummary {
  batch: string;
}

export interface DepartmentSummaryRow extends GroupSummary {
  department: string;
}

export interface CountryMobilityRow extends GroupSummary {
  country: string;
}

export type StandingReturnStatus = "filed" | "drafting" | "in_review" | "not_started";

export interface StandingReturn {
  title: string;
  meta: string | null;
  status: StandingReturnStatus;
}

export interface HigherEducationReports {
  summary: { batchesTracked: number; totalAspirants: number; totalValue: number };
  progression: ProgressionRow[];
  departmentSummary: DepartmentSummaryRow[];
  countryMobility: CountryMobilityRow[];
  standingReturns: StandingReturn[];
}

/** GET /me/higher-education-reports */
export function useHigherEducationReports() {
  return useQuery({
    queryKey: ["me", "higher-education-reports"],
    queryFn: () => apiClient.get<HigherEducationReports>("/me/higher-education-reports"),
  });
}
