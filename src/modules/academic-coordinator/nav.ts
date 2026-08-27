import type { ModuleConfig } from "@/modules/types";

const BASE = "/academic-coordinator";

/**
 * Real nav data for the shared AppShell/Sidebar/Topbar. Previously this
 * module rendered its own AcademicCoordinatorSidebar off a bespoke
 * CoordinatorNavItem shape (grouped sections + an unused `soon` disabled-row
 * flag — no item ever set it) instead of the standard NavItem shape every
 * other migrated module's nav.ts uses. Migrated onto that shape here; the
 * bespoke sidebar/topbar components are gone.
 */
export const academicCoordinatorModuleConfig: ModuleConfig = {
  role: "academic_coordinator",
  basePath: BASE,
  moduleLabel: "Academic Coordinator",
  navGroups: [
    {
      label: "Overview",
      items: [{ key: "dashboard", label: "Dashboard", icon: "dashboard", href: `${BASE}/dashboard` }],
    },
    {
      label: "Curriculum",
      items: [
        { key: "create", label: "Create", icon: "add", href: `${BASE}/create` },
        { key: "map", label: "Map", icon: "swap_horiz", href: `${BASE}/map` },
        { key: "feedback", label: "Feedback", icon: "chat", href: `${BASE}/feedback` },
      ],
    },
    {
      label: "Planning",
      items: [
        { key: "academic-calendar", label: "Academic Calendar", icon: "calendar_month", href: `${BASE}/academic-calendar` },
      ],
    },
    {
      label: "More",
      items: [
        { key: "structure", label: "Academic Structure", icon: "layers", href: `${BASE}/structure` },
        { key: "faculty", label: "Faculty Management", icon: "person", href: `${BASE}/faculty` },
        { key: "workload", label: "Faculty Workload", icon: "schedule", href: `${BASE}/workload` },
        { key: "timetable", label: "Timetable", icon: "schedule", href: `${BASE}/timetable` },
        { key: "attendance", label: "Attendance", icon: "how_to_reg", href: `${BASE}/attendance` },
        { key: "progress", label: "Course Progress", icon: "monitoring", href: `${BASE}/progress` },
        { key: "results", label: "Results", icon: "bar_chart", href: `${BASE}/results` },
        { key: "audit", label: "Academic Audit", icon: "monitoring", href: `${BASE}/audit` },
        { key: "reports", label: "Reports", icon: "description", href: `${BASE}/reports` },
      ],
    },
  ],
};
