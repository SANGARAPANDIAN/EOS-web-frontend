import type { ModuleConfig } from "@/modules/types";

const BASE = "/higher-education";

export const higherEducationModuleConfig: ModuleConfig = {
  role: "higheredu",
  basePath: BASE,
  moduleLabel: "Higher education",
  navGroups: [
    {
      label: "Overview",
      items: [
        { key: "dashboard", label: "Dashboard", icon: "dashboard", href: `${BASE}/dashboard` },
        { key: "reports", label: "Reports & analytics", icon: "monitoring", href: `${BASE}/reports` },
        { key: "announcements", label: "Announcements", icon: "campaign", href: `${BASE}/announcements` },
        { key: "calendar", label: "Academic calendar", icon: "calendar_month", href: `${BASE}/calendar` },
      ],
    },
    {
      label: "Pipeline",
      items: [
        { key: "aspirants", label: "Aspirants", icon: "groups", href: `${BASE}/aspirants`, badgeKey: "heAspirants" },
        { key: "applications", label: "Applications", icon: "description", href: `${BASE}/applications`, badgeKey: "heApplications" },
        { key: "tests", label: "Test readiness", icon: "checklist", href: `${BASE}/tests`, badgeKey: "heTests" },
      ],
    },
    {
      label: "Resources",
      items: [
        { key: "universities", label: "Universities", icon: "school", href: `${BASE}/universities`, badgeKey: "heUniversities" },
        { key: "scholarships", label: "Scholarships & funding", icon: "savings", href: `${BASE}/scholarships`, badgeKey: "heScholarships" },
      ],
    },
  ],
};
