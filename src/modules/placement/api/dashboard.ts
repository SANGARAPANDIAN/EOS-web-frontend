import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { placementKeys } from "./queryKeys";

export interface UpcomingDrive {
  id: number;
  date: string;
  day: string;
  month: string;
  company: string;
  // No placement_drives column for venue yet — role is real, venue stays
  // undefined until the backend adds it.
  role?: string;
  venue?: string;
}

export interface PlacementFunnel {
  eligible: number;
  applied: number;
  shortlisted: number;
  interviewed: number;
  offers: number;
  placed: number;
}

export interface PackageBand {
  label: string;
  count: number;
}

export interface TrendPoint {
  cycle: string;
  rate: number;
}

export interface TopRecruiter {
  company: string;
  offers: number;
  avgPackageLpa: number;
}

export interface AttentionFlag {
  title: string;
  description: string;
  href: string;
}

export interface DashboardSummary {
  totalCompanies: number;
  companiesAddedThisMonth: number;
  activeDrives: number;
  drivesClosingThisWeek: number;
  studentsInProcess: number;
  studentsInProcessDriveCount: number;
  studentsPlaced: number;
  /** Real count of offers with offer_response === "accepted" — the student's own choice, distinct from studentsPlaced (which just means the application reached "placed" status). */
  acceptedOffersCount: number;
  /** No historical snapshot to compare against yet — always 0. */
  studentsPlacedYoyPct: number;
  placementPercentage: number;
  highestPackageLpa: number;
  averagePackageLpa: number;
  offersByMonth: { month: string; count: number }[];
  placementRateByDepartment: { department: string; placed: number; total: number }[];
  upcomingDrives: UpcomingDrive[];
  eligibleStudentsTotal: number;
  funnel: PlacementFunnel;
  packageBands: PackageBand[];
  sixYearTrend: TrendPoint[];
  topRecruiters: TopRecruiter[];
  attentionFlags: AttentionFlag[];
}

// Raw shape of GET /drives/placement-stats — computed entirely server-side
// in one request. This used to be a client-side walk of every drive's
// applications plus a 36-page student-roster pull, which was enough
// requests to trip the app's global rate limiter and exhaust the DB
// connection pool, so all of that logic now lives in the backend.
interface PlacementStats {
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

async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const stats = await apiClient.get<PlacementStats>("/drives/placement-stats");
  return {
    totalCompanies: stats.totalCompanies,
    companiesAddedThisMonth: stats.companiesAddedThisMonth,
    activeDrives: stats.activeDriveCount,
    drivesClosingThisWeek: stats.drivesClosingThisWeek,
    studentsInProcess: stats.studentsInProcess,
    studentsInProcessDriveCount: stats.studentsInProcessDriveCount,
    studentsPlaced: stats.studentsPlaced,
    acceptedOffersCount: stats.acceptedOffersCount,
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
}

export function useDashboardSummary() {
  return useQuery({
    queryKey: placementKeys.dashboard(),
    queryFn: fetchDashboardSummary,
  });
}
