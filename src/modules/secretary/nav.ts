import type { ModuleConfig } from "@/modules/types";

// Real nav data for the shared AppShell/Sidebar (see SecretaryShell.tsx).
// Icons are Material Symbols Rounded ligature names (matching every other
// migrated module's nav.ts), NOT the hand-drawn SecretaryIcon strokes used
// elsewhere in this module's own pages (icons.tsx) — those are unrelated to
// this chrome and left untouched since other Secretary pages still use them.
//
// Badge counts are real, computed live in SecretaryShell from each item's
// actual pending count (usePurchaseRequests/useServiceRequests/
// useMediaRequests/useVenueBookings/useOutpasses/useDocuments/useMyLeaves/
// useMyOds) — same "shell fetches the live counts, nav.ts only names the
// key" pattern every other migrated module's badgeKey already uses.
// "Students" has no real "pending" concept anywhere in the schema, so it
// gets no badgeKey rather than a fabricated one.

const BASE = "/secretary";

export const secretaryModuleConfig: ModuleConfig = {
  role: "secretary",
  basePath: BASE,
  moduleLabel: "Secretary Portal",
  navGroups: [
    {
      label: "Overview",
      items: [
        { key: "dashboard", label: "Dashboard", icon: "dashboard", href: `${BASE}/dashboard` },
        { key: "notices", label: "Announcements", icon: "campaign", href: `${BASE}/announcements` },
        { key: "reports", label: "Reports", icon: "monitoring", href: `${BASE}/reports` },
        { key: "calendar", label: "Academic Calendar", icon: "calendar_month", href: `${BASE}/calendar` },
      ],
    },
    {
      label: "Requests",
      items: [
        { key: "pop", label: "POP Requests", icon: "receipt_long", href: `${BASE}/pop`, badgeKey: "secretaryPop" },
        { key: "sop", label: "SOP Requests", icon: "assignment", href: `${BASE}/sop`, badgeKey: "secretarySop" },
        { key: "media", label: "Media Request", icon: "photo_camera", href: `${BASE}/media`, badgeKey: "secretaryMedia" },
        { key: "venue", label: "Venue Booking", icon: "location_on", href: `${BASE}/venue`, badgeKey: "secretaryVenue" },
        { key: "outpass", label: "Student Outpass", icon: "logout", href: `${BASE}/outpass`, badgeKey: "secretaryOutpass" },
      ],
    },
    {
      label: "Department",
      items: [
        { key: "attendance", label: "Bulk Attendance", icon: "fact_check", href: `${BASE}/attendance` },
        { key: "faculty", label: "Faculty", icon: "groups", href: `${BASE}/faculty` },
        { key: "students", label: "Students", icon: "groups_2", href: `${BASE}/students` },
        { key: "docs", label: "Documents", icon: "folder", href: `${BASE}/docs`, badgeKey: "secretaryDocs" },
        { key: "dept", label: "Department Details", icon: "apartment", href: `${BASE}/dept` },
      ],
    },
    {
      label: "Employee",
      items: [
        { key: "empAtt", label: "Attendance", icon: "checklist", href: `${BASE}/emp-attendance` },
        { key: "empLeave", label: "Leave", icon: "beach_access", href: `${BASE}/emp-leave`, badgeKey: "secretaryEmpLeave" },
        { key: "empOd", label: "OD", icon: "directions_walk", href: `${BASE}/emp-od`, badgeKey: "secretaryEmpOd" },
        { key: "empPayroll", label: "HR Payroll", icon: "payments", href: `${BASE}/emp-payroll` },
        { key: "empPayslip", label: "Payslip", icon: "receipt_long", href: `${BASE}/emp-payslip` },
        { key: "empAppraisal", label: "Appraisal", icon: "trending_up", href: `${BASE}/emp-appraisal` },
        { key: "empLibrary", label: "Library", icon: "local_library", href: `${BASE}/emp-library` },
      ],
    },
  ],
};
