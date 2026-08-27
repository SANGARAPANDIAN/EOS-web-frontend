import type { ModuleConfig } from "@/modules/types";

// Real nav data for the shared AppShell/Sidebar (see SecretaryShell.tsx).
// Icons are Material Symbols Rounded ligature names (matching every other
// migrated module's nav.ts), NOT the hand-drawn SecretaryIcon strokes used
// elsewhere in this module's own pages (icons.tsx) — those are unrelated to
// this chrome and left untouched since other Secretary pages still use them.
//
// Badge counts: the previous badge literals (`badge: "3"`, etc.) were fake
// numbers baked into this file with no backing data — no secretary/api/*
// hook exposes a real pending-count endpoint for any of these items (only
// full paginated list-fetch hooks like useOutpasses/useMediaRequests exist,
// each requiring its own network call), so badges are omitted entirely
// rather than fabricated or wired at the cost of firing 7+ extra requests
// on every page just to populate the sidebar.

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
        { key: "pop", label: "POP Requests", icon: "receipt_long", href: `${BASE}/pop` },
        { key: "sop", label: "SOP Requests", icon: "assignment", href: `${BASE}/sop` },
        { key: "media", label: "Media Request", icon: "photo_camera", href: `${BASE}/media` },
        { key: "venue", label: "Venue Booking", icon: "location_on", href: `${BASE}/venue` },
        { key: "outpass", label: "Student Outpass", icon: "logout", href: `${BASE}/outpass` },
      ],
    },
    {
      label: "Department",
      items: [
        { key: "attendance", label: "Bulk Attendance", icon: "fact_check", href: `${BASE}/attendance` },
        { key: "faculty", label: "Faculty", icon: "groups", href: `${BASE}/faculty` },
        { key: "students", label: "Students", icon: "groups_2", href: `${BASE}/students` },
        { key: "docs", label: "Documents", icon: "folder", href: `${BASE}/docs` },
        { key: "dept", label: "Department Details", icon: "apartment", href: `${BASE}/dept` },
      ],
    },
    {
      label: "Employee",
      items: [
        { key: "empAtt", label: "Attendance", icon: "checklist", href: `${BASE}/emp-attendance` },
        { key: "empLeave", label: "Leave", icon: "beach_access", href: `${BASE}/emp-leave` },
        { key: "empOd", label: "OD", icon: "directions_walk", href: `${BASE}/emp-od` },
        { key: "empPayroll", label: "HR Payroll", icon: "payments", href: `${BASE}/emp-payroll` },
        { key: "empPayslip", label: "Payslip", icon: "receipt_long", href: `${BASE}/emp-payslip` },
        { key: "empAppraisal", label: "Appraisal", icon: "trending_up", href: `${BASE}/emp-appraisal` },
        { key: "empLibrary", label: "Library", icon: "local_library", href: `${BASE}/emp-library` },
      ],
    },
  ],
};
