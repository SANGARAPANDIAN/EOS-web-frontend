import type { AdvisorIconKind } from "./icons";

const BASE = "/faculty";

export interface AdvisorNavItem {
  key: string;
  label: string;
  icon: AdvisorIconKind;
  href: string;
  /** Hardcoded badge counts ("2", "3") in the design were sample data —
   * real counts are wired in by AdvisorShell from live pending-request
   * data, never fabricated here. */
  badgeKey?: "pendingLeave" | "pendingOd";
}

export interface AdvisorNavGroup {
  label: string;
  /** Only the OVERVIEW group shows the "«" chevron in the design. */
  chevron?: boolean;
  /** True only for "MY CLASS" — rendered only when the logged-in faculty is
   * an active class_mentors advisor for at least one class this academic
   * year. Every other group is common to all faculty regardless of advisor
   * status. Determined live via useIsClassAdvisor(), never hardcoded. */
  advisorOnly?: boolean;
  items: AdvisorNavItem[];
}

// Group labels, item order, item labels, and the id -> icon-kind mapping are
// ported exactly from NAV / NAV_ICON in the design reference's script block.
export const ADVISOR_NAV: AdvisorNavGroup[] = [
  {
    label: "OVERVIEW",
    chevron: true,
    items: [
      { key: "dashboard", label: "Dashboard", icon: "dashboard", href: `${BASE}/dashboard` },
      { key: "reports", label: "Reports & Analytics", icon: "reports", href: `${BASE}/reports` },
      { key: "announcements", label: "Announcements", icon: "announcements", href: `${BASE}/announcements` },
    ],
  },
  {
    label: "CLASS",
    items: [
      { key: "attendance", label: "Attendance", icon: "attendance", href: `${BASE}/attendance` },
      { key: "subject-records", label: "Subject Records", icon: "subject", href: `${BASE}/subject-records` },
      { key: "assignments", label: "Assignment Status", icon: "assignment", href: `${BASE}/assignments` },
    ],
  },
  {
    label: "MY CLASS",
    advisorOnly: true,
    items: [
      { key: "students", label: "Student Records", icon: "results", href: `${BASE}/students` },
      { key: "higher-education", label: "Higher Education", icon: "cia", href: `${BASE}/higher-education` },
      { key: "edc", label: "EDC", icon: "reports", href: `${BASE}/edc` },
      { key: "exams", label: "Examination & Results", icon: "cia", href: `${BASE}/exams` },
      { key: "placements", label: "Placements", icon: "results", href: `${BASE}/placements` },
      { key: "leave", label: "Leave", icon: "leave", href: `${BASE}/leave`, badgeKey: "pendingLeave" },
      { key: "od", label: "OD", icon: "od", href: `${BASE}/od`, badgeKey: "pendingOd" },
      { key: "no-due", label: "No Due", icon: "payslip", href: `${BASE}/no-due` },
    ],
  },
  {
    label: "EMPLOYEE",
    items: [
      { key: "my-attendance", label: "Attendance", icon: "attendance", href: `${BASE}/my-attendance` },
      { key: "timetable", label: "Timetable", icon: "attendance", href: `${BASE}/timetable` },
      { key: "current-semester", label: "Current Semester", icon: "subject", href: `${BASE}/current-semester` },
      { key: "my-leave", label: "Leave", icon: "leave", href: `${BASE}/my-leave` },
      { key: "my-od", label: "OD", icon: "od", href: `${BASE}/my-od` },
      { key: "venue-booking", label: "Venue", icon: "venue", href: `${BASE}/venue-booking` },
      { key: "payroll", label: "HR Payroll", icon: "payroll", href: `${BASE}/payroll` },
      { key: "payslip", label: "Payslip", icon: "payslip", href: `${BASE}/payslip` },
      { key: "appraisal", label: "Appraisal", icon: "appraisal", href: `${BASE}/appraisal` },
      { key: "academic-calendar", label: "Academic Calendar", icon: "attendance", href: `${BASE}/academic-calendar` },
      { key: "library", label: "Library", icon: "library", href: `${BASE}/library` },
    ],
  },
];

// Kept for compatibility with anything still importing the old ModuleConfig
// shape (role/basePath) elsewhere (e.g. MODULE_REGISTRY, login redirect) —
// navGroups here is intentionally unused by AdvisorShell, which renders from
// ADVISOR_NAV above to get the exact design markup/behaviour instead of the
// generic AppShell/Sidebar.
export const advisorModuleConfig = {
  role: "faculty",
  basePath: BASE,
  moduleLabel: "Faculty",
  navGroups: [],
};
