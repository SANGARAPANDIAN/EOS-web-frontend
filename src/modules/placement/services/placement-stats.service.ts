import { apiClient } from "@/lib/api/client";
import type { AttentionFlag, PackageBand, PlacementFunnel, TopRecruiter, TrendPoint, UpcomingDrive } from "../types";

export interface PlacementStats {
  totalCompanies: number;
  companiesAddedThisMonth: number;
  activeDriveCount: number;
  drivesClosingThisWeek: number;
  studentsInProcess: number;
  studentsInProcessDriveCount: number;
  studentsPlaced: number;
  acceptedOffersCount: number;
  highestPackageLpa: number;
  averagePackageLpa: number;
  offersByMonth: { month: string; count: number }[];
  upcomingDrives: UpcomingDrive[];
  eligibleStudentsTotal: number;
  placementRate: number;
  placementRateByDepartment: { department: string; placed: number; total: number }[];
  funnel: PlacementFunnel;
  packageBands: PackageBand[];
  sixYearTrend: TrendPoint[];
  topRecruiters: TopRecruiter[];
  attentionFlags: AttentionFlag[];
}

// Computed entirely server-side in one request (DrivesService.getPlacementStats)
// — this used to be a client-side walk of every drive's applications plus a
// 36-page student-roster pull, which was enough requests to trip the app's
// global rate limiter (100 req/min) and exhaust the DB connection pool.
export const placementStatsService = {
  // batchId scopes eligible-student totals, placement rate and the class/
  // department breakdown to one batch — everything else (drives, offers by
  // month, packages) stays global regardless, since a drive isn't tied to
  // a single batch.
  async get(batchId?: number): Promise<PlacementStats> {
    return apiClient.get<PlacementStats>("/drives/placement-stats", { batch_id: batchId });
  },
};
