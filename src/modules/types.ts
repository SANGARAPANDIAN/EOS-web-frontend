export type NavBadgeKey =
  | "announcementsRecent"
  | "feesDue"
  | "feedbackPending"
  | "fleetBuses"
  | "fleetRoutes"
  | "crewCount"
  | "maintenanceDue"
  | "complianceExpiring";

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
