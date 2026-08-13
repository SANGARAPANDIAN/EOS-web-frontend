export type NavBadgeKey =
  | "announcementsRecent"
  | "feesDue"
  | "feedbackPending"
  | "facultyCount"
  | "leaveRequestsPending"
  | "odRequestsPending";

export interface NavItem {
  key: string;
  label: string;
  /** Omit for modules whose design reference uses no icon font at all (e.g. HoD) — Sidebar renders nothing in its place rather than a placeholder glyph. */
  icon?: string;
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
