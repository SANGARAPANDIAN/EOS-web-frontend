export type NavBadgeKey =
  | "announcementsRecent"
  | "feesDue"
  | "feedbackPending"
  | "principalStudentsTotal"
  | "principalFacultyTotal"
  | "fleetBuses"
  | "fleetRoutes"
  | "crewCount"
  | "maintenanceDue"
  | "complianceExpiring"
  | "heAspirants"
  | "heApplications"
  | "heTests"
  | "heUniversities"
  | "heScholarships"
  | "mcOpdWaiting"
  | "mcBedsOccupied"
  | "mcLowStock"
  | "hwPendingPasses"
  | "hwPendingLeave"
  | "hwOpenComplaints"
  | "sportsAthletes"
  | "sportsTeams"
  | "sportsTrialsPending"
  | "sportsOdPending"
  | "sportsDisciplines"
  | "sportsAchievements"
  | "studentCount"
  | "facultyCount"
  | "totalBooks";

export interface NavItem {
  key: string;
  label: string;
  icon: string;
  href: string;
  /** Populated at render time from live data (recent-item counts, dues, etc.) — never hardcoded. */
  badgeKey?: NavBadgeKey;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export interface ModuleConfig {
  role: string;
  basePath: string;
  moduleLabel: string;
  navGroups: NavGroup[];
}
