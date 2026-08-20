// Ported verbatim from the `navGroups` array in
// "Secretary Module - Web/Secretary Dashboard.dc.html" (line 3158). Badge
// counts are the design's own literal computed values (e.g.
// `pendingPop`/`pendingSop`/open-issue counts) — this is the skeleton pass
// with the design's own fake data (see fakeData.ts), matching the same
// process used for the EDC module: fake data first, backend wiring later.

export interface SecretaryNavItem {
  id: string;
  label: string;
  icon: string;
  badge?: string;
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
      { id: "pop", label: "POP Requests", icon: "receipt", badge: "3", href: "/secretary/pop" },
      { id: "sop", label: "SOP Requests", icon: "clipboard", badge: "3", href: "/secretary/sop" },
      { id: "media", label: "Media Request", icon: "camera", badge: "2", href: "/secretary/media" },
      { id: "venue", label: "Venue Booking", icon: "pin", badge: "1", href: "/secretary/venue" },
      { id: "outpass", label: "Student Outpass", icon: "exit", badge: "2", href: "/secretary/outpass" },
    ],
  },
  {
    label: "Department",
    items: [
      { id: "attendance", label: "Bulk Attendance", icon: "calcheck", href: "/secretary/attendance" },
      { id: "faculty", label: "Faculty", icon: "faculty", href: "/secretary/faculty" },
      { id: "students", label: "Students", icon: "students", badge: "3", href: "/secretary/students" },
      { id: "docs", label: "Documents", icon: "folder", badge: "3", href: "/secretary/docs" },
      { id: "dept", label: "Department Details", icon: "building", href: "/secretary/dept" },
    ],
  },
  {
    label: "Employee",
    items: [
      { id: "empAtt", label: "Attendance", icon: "calcheck", href: "/secretary/emp-attendance" },
      { id: "empLeave", label: "Leave", icon: "clipboard", badge: "2", href: "/secretary/emp-leave" },
      { id: "empOd", label: "OD", icon: "faculty", badge: "3", href: "/secretary/emp-od" },
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
