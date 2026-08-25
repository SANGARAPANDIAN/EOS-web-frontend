import type { ModuleConfig } from "@/modules/types";

/**
 * Registry-facing config — only `basePath` is actually read (by the root
 * page and login page's post-auth redirect). The real nav definition lives
 * in PLACEMENT_NAV below since PlacementSidebar has its own item shape (live
 * count badges) rather than the student-shaped shared NavItem type.
 */
export const placementModuleConfig: ModuleConfig = {
  role: "placement",
  basePath: "/placement",
  moduleLabel: "Placement Cell",
  navGroups: [],
};

export interface PlacementNavItem {
  href: string;
  label: string;
  icon: string;
  /** Populated at render time from live data — never hardcoded. */
  badgeKey?: "students" | "companies" | "drives";
}

export interface PlacementNavGroup {
  label: string;
  items: PlacementNavItem[];
}

// notifications/rounds intentionally absent — neither was reachable from
// this nav in the source app either (mock-backed data / superseded by the
// drive detail page's own student list), so this migration doesn't carry
// them forward.
export const PLACEMENT_NAV: PlacementNavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/placement/dashboard", label: "Dashboard", icon: "dashboard" },
      { href: "/placement/announcements", label: "Announcements", icon: "campaign" },
      { href: "/placement/academic-calendar", label: "Academic calendar", icon: "calendar_month" },
    ],
  },
  {
    label: "Recruitment",
    items: [
      { href: "/placement/students", label: "Students", icon: "groups", badgeKey: "students" },
      { href: "/placement/companies", label: "Companies", icon: "business_center", badgeKey: "companies" },
      { href: "/placement/drives", label: "Placement Drives", icon: "event_available", badgeKey: "drives" },
    ],
  },
  {
    label: "Process",
    items: [
      { href: "/placement/interviews", label: "Interviews", icon: "forum" },
      { href: "/placement/offers", label: "Offers", icon: "workspace_premium" },
    ],
  },
  {
    label: "Outcomes",
    items: [
      { href: "/placement/placements", label: "Placements", icon: "bar_chart" },
      { href: "/placement/reports", label: "Reports", icon: "summarize" },
    ],
  },
];

/** Flat list — kept for any code that needs "every nav item" without the group structure (e.g. the topbar's jump-to-page search). */
export const PLACEMENT_NAV_FLAT: PlacementNavItem[] = PLACEMENT_NAV.flatMap((g) => g.items);
