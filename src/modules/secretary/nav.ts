// Ported from the `navGroups` array in
// "Secretary Module - Web/Secretary Dashboard.dc.html" (line 3158). Badge
// counts were originally the design's own literal fake values — now real,
// computed live in SecretaryShell (see its `badgeCounts` map) from each
// item's actual pending count, same "shell fetches the live badge counts"
// pattern HodShell already uses. Items have no `badge` field of their own
// — the shell looks one up per item id at render time, showing nothing
// while loading or when the real count is 0.

export interface SecretaryNavItem {
  id: string;
  label: string;
  icon: string;
  href: string;
}

export interface SecretaryNavGroup {
  label: string;
  items: SecretaryNavItem[];
}

export const SECRETARY_NAV: SecretaryNavGroup[] = [
  {
    label: "Overview",
    items: [
      { id: "dashboard", label: "Dashboard", icon: "dashboard", href: "/secretary/dashboard" },
      { id: "notices", label: "Announcements", icon: "megaphone", href: "/secretary/announcements" },
      { id: "reports", label: "Reports", icon: "trending", href: "/secretary/reports" },
      { id: "calendar", label: "Academic Calendar", icon: "calendarPage", href: "/secretary/calendar" },
    ],
  },
  {
    label: "Requests",
    items: [
      { id: "pop", label: "POP Requests", icon: "receipt", href: "/secretary/pop" },
      { id: "sop", label: "SOP Requests", icon: "clipboard", href: "/secretary/sop" },
      { id: "media", label: "Media Request", icon: "camera", href: "/secretary/media" },
      { id: "venue", label: "Venue Booking", icon: "pin", href: "/secretary/venue" },
      { id: "outpass", label: "Student Outpass", icon: "exit", href: "/secretary/outpass" },
    ],
  },
  {
    label: "Department",
    items: [
      { id: "attendance", label: "Bulk Attendance", icon: "calcheck", href: "/secretary/attendance" },
      { id: "faculty", label: "Faculty", icon: "faculty", href: "/secretary/faculty" },
      { id: "students", label: "Students", icon: "students", href: "/secretary/students" },
      { id: "docs", label: "Documents", icon: "folder", href: "/secretary/docs" },
      { id: "dept", label: "Department Details", icon: "building", href: "/secretary/dept" },
    ],
  },
  {
    label: "Employee",
    items: [
      { id: "empAtt", label: "Attendance", icon: "calcheck", href: "/secretary/emp-attendance" },
      { id: "empLeave", label: "Leave", icon: "clipboard", href: "/secretary/emp-leave" },
      { id: "empOd", label: "OD", icon: "faculty", href: "/secretary/emp-od" },
      { id: "empPayroll", label: "HR Payroll", icon: "rupee", href: "/secretary/emp-payroll" },
      { id: "empPayslip", label: "Payslip", icon: "receipt", href: "/secretary/emp-payslip" },
      { id: "empAppraisal", label: "Appraisal", icon: "star", href: "/secretary/emp-appraisal" },
      { id: "empLibrary", label: "Library", icon: "library", href: "/secretary/emp-library" },
    ],
  },
];

// Registers the secretary role with MODULE_REGISTRY (login redirect + route
// guard) — same compat-shim pattern as edcModuleConfig in modules/edc/nav.ts.
// navGroups is intentionally empty: SecretaryShell renders from SECRETARY_NAV
// above, not the generic AppShell/Sidebar.
export const secretaryModuleConfig = {
  role: "secretary",
  basePath: "/secretary",
  moduleLabel: "Secretary Portal",
  navGroups: [],
};
