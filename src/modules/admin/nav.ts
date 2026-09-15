import type { ModuleConfig } from "@/modules/types";

/**
 * Single source of truth for Admin's nav rail — consumed directly by the
 * shared `Sidebar` (via `AppShell`) and by `AdminShell`'s topbar "jump to
 * page" search, which flattens `navGroups` and filters by label.
 */
export const adminModuleConfig: ModuleConfig = {
  role: "admin",
  basePath: "/admin",
  moduleLabel: "Admin",
  navGroups: [
    {
      label: "Overview",
      items: [
        { key: "dashboard", href: "/admin/dashboard", label: "Dashboard", icon: "dashboard" },
        { key: "analytics", href: "/admin/analytics", label: "Analytics", icon: "insights" },
        { key: "reports", href: "/admin/reports", label: "Reports", icon: "description" },
      ],
    },
    {
      label: "Students",
      items: [
        { key: "students", href: "/admin/students", label: "Students", icon: "groups", badgeKey: "studentCount" },
        { key: "admit", href: "/admin/students/admit", label: "Admissions", icon: "person_add" },
        { key: "bonafide-requests", href: "/admin/bonafide-requests", label: "Bonafide requests", icon: "description" },
      ],
    },
    {
      label: "Faculty",
      items: [
        { key: "faculty", href: "/admin/faculty", label: "Directory", icon: "badge", badgeKey: "facultyCount" },
        { key: "faculty-attendance", href: "/admin/faculty/attendance", label: "Attendance", icon: "event_available" },
        { key: "faculty-assignments", href: "/admin/faculty/assignments", label: "Assignments", icon: "assignment_ind" },
        { key: "faculty-reports", href: "/admin/faculty/reports", label: "Reports", icon: "summarize" },
        { key: "faculty-settings", href: "/admin/faculty/settings", label: "Settings", icon: "settings" },
      ],
    },
    {
      label: "Requests",
      items: [
        { key: "sop-requests", href: "/admin/sop-requests", label: "SOP requests", icon: "handyman", badgeKey: "adminSopPending" },
      ],
    },
    {
      label: "Facilities",
      items: [
        { key: "venues", href: "/admin/facilities/venues", label: "Venues", icon: "meeting_room" },
        { key: "hostel-blocks", href: "/admin/facilities/hostel-blocks", label: "Hostel blocks", icon: "apartment" },
      ],
    },
  ],
};
