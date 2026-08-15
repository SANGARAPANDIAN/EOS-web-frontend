import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export type DashboardRange = "today" | "week" | "year";

export interface MedicalCentreDashboard {
  totalStudents: number;
  extended: { opdQueue: boolean; staffDuty: boolean; sickRoom: boolean; pharmacy: boolean };
  kpis: {
    visits: number;
    visitsReferred: number;
    visitsBarPercent: number;
    visitsNote: string;
    bedsOccupied: number;
    bedsTotal: number;
    bedsFree: number;
    bedsBarPercent: number;
    longestStayMinutes: number | null;
    opdWaiting: number;
    opdConsulting: number;
    opdBarPercent: number;
    dispensed: number;
    lowStockCount: number;
    dispensedBarPercent: number;
  };
  occupiedBeds: { id: string; bedId: number; name: string; reason: string; since: string }[];
  needsAttention: { title: string; description: string }[];
  advisories: { tag: string; when: string; title: string }[];
  todaysRoster: { name: string; role: string; shift: string }[];
  recentTreatmentLog: { who: string; date: string; note: string; by: string }[];
}

/** GET /me/medical-centre-dashboard?range= */
export function useMedicalCentreDashboard(range: DashboardRange) {
  return useQuery({
    queryKey: ["me", "medical-centre-dashboard", range],
    queryFn: () => apiClient.get<MedicalCentreDashboard>("/me/medical-centre-dashboard", { range }),
  });
}
