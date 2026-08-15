import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface HostelDashboardSummary {
  total_residents: number;
  currently_present: number;
  on_leave: number;
  pending_approvals: number;
  beds_total: number;
  beds_occupied: number;
  beds_vacant: number;
  occupancy_pct: number;
  complaints_open: number;
}

export interface LibraryDashboardSummary {
  total_books: number;
  available_books: number;
  total_ebooks: number;
  active_borrowings: number;
  overdue_books: number;
  lost_books: number;
  damaged_books: number;
}

export interface ClassPlacementRecord {
  className: string;
  students: number;
  placed: number;
  highestLpa: number;
  departmentName: string;
}

export interface DepartmentPlacementRecord {
  department: string;
  students: number;
  placed: number;
  highestLpa: number;
}

export interface PlacementStats {
  totalCompanies: number;
  companiesAddedThisMonth: number;
  activeDriveCount: number;
  drivesClosingThisWeek: number;
  studentsInProcess: number;
  studentsInProcessDriveCount: number;
  studentsPlaced: number;
  highestPackageLpa: number;
  averagePackageLpa: number;
  offersByMonth: { month: string; count: number }[];
  eligibleStudentsTotal: number;
  placementRate: number;
  classWise: ClassPlacementRecord[];
  departmentWise: DepartmentPlacementRecord[];
  placementRateByDepartment: { department: string; placed: number; total: number }[];
}

/**
 * These three hooks call the same real Hostel/Library/Placement aggregate
 * endpoints the old admin console's Analytics page reads — ported directly
 * rather than migrating the entire hostel/library/placement modules (a
 * separate, larger phase), since the page only ever needed these three
 * summary reads.
 */
export function useHostelDashboardSummary() {
  return useQuery({
    queryKey: ["hostel", "dashboard-summary"],
    queryFn: () => apiClient.get<HostelDashboardSummary>("/hostel/dashboard/summary"),
  });
}

export function useLibraryDashboardSummary() {
  return useQuery({
    queryKey: ["library", "dashboard-summary"],
    queryFn: () => apiClient.get<LibraryDashboardSummary>("/library/dashboard/summary"),
  });
}

/**
 * Computed server-side in one request. `batchId` scopes eligible-student
 * totals, placement rate and the class/department breakdown to one batch —
 * everything else (drives, offers by month, packages) stays global.
 */
export function usePlacementStats(batchId?: number) {
  return useQuery({
    queryKey: ["placement", "stats", batchId ?? null],
    queryFn: () => apiClient.get<PlacementStats>("/drives/placement-stats", batchId ? { batch_id: batchId } : undefined),
  });
}
