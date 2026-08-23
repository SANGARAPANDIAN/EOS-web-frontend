import type { ModuleConfig } from "@/modules/types";

/**
 * Registry-facing config — only `basePath` is actually read (by the root
 * page and login page's post-auth redirect). The real admin nav definition
 * lives in ADMIN_NAV below since AdminSidebar has its own richer item shape
 * (live count badges) than the student-shaped shared NavItem type.
 */
export const adminModuleConfig: ModuleConfig = {
  role: "admin",
  basePath: "/admin",
  moduleLabel: "Admin",
  navGroups: [],
};

export interface AdminNavItem {
  href: string;
  label: string;
  icon: string;
  /** Populated at render time from live data (e.g. total students/faculty on roll) — never hardcoded. */
  badgeKey?: "studentCount" | "facultyCount";
}

export interface AdminNavGroup {
  label: string;
  items: AdminNavItem[];
}

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/admin/dashboard", label: "Dashboard", icon: "dashboard" },
      { href: "/admin/analytics", label: "Analytics", icon: "insights" },
      { href: "/admin/reports", label: "Reports", icon: "description" },
    ],
  },
  {
    label: "Students",
    items: [
      { href: "/admin/students", label: "Students", icon: "groups", badgeKey: "studentCount" },
      { href: "/admin/students/admit", label: "Admissions", icon: "person_add" },
      { href: "/admin/academics", label: "Academic structure", icon: "layers" },
    ],
  },
  {
    label: "Faculty",
    items: [
      { href: "/admin/faculty", label: "Directory", icon: "badge", badgeKey: "facultyCount" },
      { href: "/admin/faculty/attendance", label: "Attendance", icon: "event_available" },
      { href: "/admin/faculty/assignments", label: "Assignments", icon: "assignment_ind" },
      { href: "/admin/faculty/reports", label: "Reports", icon: "summarize" },
      { href: "/admin/faculty/settings", label: "Settings", icon: "settings" },
    ],
  },
];
