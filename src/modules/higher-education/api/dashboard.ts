import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface HigherEducationDashboard {
  extended: boolean;
  finalYearEligible: number;
  kpis: {
    aspirants: { total: number; withinIndia: number; abroad: number };
    applicationsFiled: number | null;
    admits: { total: number; abroad: number; withinIndia: number } | null;
    scholarship: { totalValue: number; fundedCount: number; meanValue: number | null } | null;
  };
  commandCenter: {
    finalYearEligible: number;
    universitiesInPlay: number;
    highestScholarship: number | null;
    averageScholarship: number | null;
    admissionsConfirmed: number;
    admissionsTotal: number;
  };
  needsAttention: { title: string; description: string }[];
  progressionPipeline: { label: string; count: number; percent: number }[] | null;
  destinations: { country: string; count: number }[];
  interviewsUpcoming: { date: string; studentName: string; university: string | null }[];
  departmentRows: { dept: string; aspirants: number; admits: number; abroad: number; conversion: string }[];
  testReadiness: { testName: string; enrolled: number; meanScore: number }[];
  applicationReadiness: {
    sopFinalized: number;
    recommendationIssued: number;
    researchRecorded: number;
    internshipRecorded: number;
    total: number;
  } | null;
}

/** GET /me/higher-education-dashboard — aspirant pipeline, admits, scholarships and readiness for the Higher Education Cell. */
export function useHigherEducationDashboard() {
  return useQuery({
    queryKey: ["me", "higher-education-dashboard"],
    queryFn: () => apiClient.get<HigherEducationDashboard>("/me/higher-education-dashboard"),
  });
}
