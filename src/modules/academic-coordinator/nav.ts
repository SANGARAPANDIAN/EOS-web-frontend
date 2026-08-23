import type { ModuleConfig } from "@/modules/types";

/**
 * Registry-facing config — only `basePath` is actually read (by the root
 * page and login page's post-auth redirect). The real nav definition lives
 * in COORDINATOR_NAV below since AcademicCoordinatorSidebar has its own item
 * shape (grouped sections, a `soon` disabled-row flag) rather than the
 * student-shaped shared NavItem type.
 */
export const academicCoordinatorModuleConfig: ModuleConfig = {
  role: "academic_coordinator",
  basePath: "/academic-coordinator",
  moduleLabel: "Academic Coordinator",
  navGroups: [],
};

export interface CoordinatorNavItem {
  href: string;
  label: string;
  /** Material Symbols Rounded ligature name, rendered via <Icon name=.../>. */
  icon: string;
  /** Not wired up yet — rendered as a disabled row instead of a link. */
  soon?: boolean;
}

export interface CoordinatorNavGroup {
  label: string;
  items: CoordinatorNavItem[];
}

/**
 * Mirrors the reference UI's exact sidebar inventory — one persistent list
 * covering both "Curriculum Module" and "Academic Modules" pages (the
 * reference splits these across two separate static HTML files that link
 * back and forth to each other; a real SPA just keeps one sidebar with
 * route-based active-highlighting instead of swapping the whole nav).
 */
export const COORDINATOR_NAV: CoordinatorNavGroup[] = [
  {
    label: "OVERVIEW",
    items: [{ href: "/academic-coordinator", label: "Dashboard", icon: "dashboard" }],
  },
  {
    label: "CURRICULUM",
    items: [
      { href: "/academic-coordinator/create", label: "Create", icon: "add" },
      { href: "/academic-coordinator/map", label: "Map", icon: "swap_horiz" },
      { href: "/academic-coordinator/feedback", label: "Feedback", icon: "chat" },
    ],
  },
  {
    label: "PLANNING",
    items: [{ href: "/academic-coordinator/academic-calendar", label: "Academic Calendar", icon: "calendar_month" }],
  },
  {
    label: "MORE",
    items: [
      { href: "/academic-coordinator/structure", label: "Academic Structure", icon: "layers" },
      { href: "/academic-coordinator/faculty", label: "Faculty Management", icon: "person" },
      { href: "/academic-coordinator/workload", label: "Faculty Workload", icon: "schedule" },
      { href: "/academic-coordinator/timetable", label: "Timetable", icon: "schedule" },
      { href: "/academic-coordinator/attendance", label: "Attendance", icon: "how_to_reg" },
      { href: "/academic-coordinator/progress", label: "Course Progress", icon: "monitoring" },
      { href: "/academic-coordinator/results", label: "Results", icon: "bar_chart" },
      { href: "/academic-coordinator/audit", label: "Academic Audit", icon: "monitoring" },
      { href: "/academic-coordinator/reports", label: "Reports", icon: "description" },
    ],
  },
];

/** Flat list — kept for any code that needs "every nav item" without the group structure (e.g. active-path matching). */
export const COORDINATOR_NAV_FLAT: CoordinatorNavItem[] = COORDINATOR_NAV.flatMap((g) => g.items);

/** Pages that render the shared "Academic year / Semester / Department / Section" context bar (the "MORE" / Academic Modules pages only — Dashboard/Create/Map/Feedback/Academic Calendar don't have it). */
export const CONTEXT_BAR_PATHS = new Set(COORDINATOR_NAV[3].items.map((i) => i.href));
