import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface MedicalCentreReports {
  year: number;
  totalVisits: number;
  deptVisits: { dept: string; v: number }[];
  topComplaints: { name: string; pct: number }[];
  monthlyVisits: { label: string; v: number }[];
}

/** GET /me/medical-centre-reports?year= */
export function useMedicalCentreReports(year?: number) {
  return useQuery({
    queryKey: ["me", "medical-centre-reports", year],
    queryFn: () => apiClient.get<MedicalCentreReports>("/me/medical-centre-reports", year ? { year } : undefined),
  });
}
