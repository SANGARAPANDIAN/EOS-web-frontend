import type { ModuleConfig } from "@/modules/types";

const BASE = "/placement";

// notifications/rounds intentionally absent — neither was reachable from
// this nav in the source app either (mock-backed data / superseded by the
// drive detail page's own student list), so this migration doesn't carry
// them forward.
export const placementModuleConfig: ModuleConfig = {
  role: "placement",
  basePath: BASE,
  moduleLabel: "Placement Cell",
  navGroups: [
    {
      label: "Overview",
      items: [
        { key: "dashboard", label: "Dashboard", icon: "dashboard", href: `${BASE}/dashboard` },
        { key: "announcements", label: "Announcements", icon: "campaign", href: `${BASE}/announcements` },
        { key: "academic-calendar", label: "Academic calendar", icon: "calendar_month", href: `${BASE}/academic-calendar` },
      ],
    },
    {
      label: "Recruitment",
      items: [
        { key: "students", label: "Students", icon: "groups", href: `${BASE}/students`, badgeKey: "placementStudents" },
        { key: "companies", label: "Companies", icon: "business_center", href: `${BASE}/companies`, badgeKey: "placementCompanies" },
        { key: "drives", label: "Placement Drives", icon: "event_available", href: `${BASE}/drives`, badgeKey: "placementDrives" },
      ],
    },
    {
      label: "Process",
      items: [
        { key: "interviews", label: "Interviews", icon: "forum", href: `${BASE}/interviews` },
        { key: "offers", label: "Offers", icon: "workspace_premium", href: `${BASE}/offers` },
      ],
    },
    {
      label: "Outcomes",
      items: [
        { key: "placements", label: "Placements", icon: "bar_chart", href: `${BASE}/placements` },
        { key: "reports", label: "Reports", icon: "summarize", href: `${BASE}/reports` },
      ],
    },
  ],
};
