import { placementStatsService } from "./placement-stats.service";
import type { DashboardSummary } from "../types";

export const dashboardService = {
  async summary(): Promise<DashboardSummary> {
    const stats = await placementStatsService.get();

    return {
      totalCompanies: stats.totalCompanies,
      companiesAddedThisMonth: stats.companiesAddedThisMonth,
      activeDrives: stats.activeDriveCount,
      drivesClosingThisWeek: stats.drivesClosingThisWeek,
      studentsInProcess: stats.studentsInProcess,
      studentsInProcessDriveCount: stats.studentsInProcessDriveCount,
      studentsPlaced: stats.studentsPlaced,
      acceptedOffersCount: stats.acceptedOffersCount,
      // No historical snapshot to compare against yet.
      studentsPlacedYoyPct: 0,
      placementPercentage: stats.placementRate,
      highestPackageLpa: stats.highestPackageLpa,
      averagePackageLpa: stats.averagePackageLpa,
      offersByMonth: stats.offersByMonth,
      placementRateByDepartment: stats.placementRateByDepartment,
      upcomingDrives: stats.upcomingDrives,
      eligibleStudentsTotal: stats.eligibleStudentsTotal,
      funnel: stats.funnel,
      packageBands: stats.packageBands,
      sixYearTrend: stats.sixYearTrend,
      topRecruiters: stats.topRecruiters,
      attentionFlags: stats.attentionFlags,
    };
  },
};
