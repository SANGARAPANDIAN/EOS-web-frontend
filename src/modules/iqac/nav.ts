import type { ModuleConfig } from "@/modules/types";
import { QUALITY_DOMAINS } from "@/modules/iqac/qualityDomains";

const BASE = "/iqac";

export const iqacModuleConfig: ModuleConfig = {
  role: "iqac",
  basePath: BASE,
  moduleLabel: "IQAC",
  navGroups: [
    {
      label: "Overview",
      items: [
        { key: "dashboard", label: "Dashboard", icon: "dashboard", href: `${BASE}/dashboard` },
        { key: "reports", label: "Reports & Analytics", icon: "monitoring", href: `${BASE}/reports` },
        { key: "announcements", label: "Announcements", icon: "campaign", href: `${BASE}/announcements` },
        { key: "calendar", label: "Academic calendar", icon: "event", href: `${BASE}/calendar` },
      ],
    },
    {
      label: "People",
      items: [
        { key: "students", label: "Students", icon: "groups", href: `${BASE}/students` },
        { key: "faculty", label: "Faculty & staff", icon: "badge", href: `${BASE}/faculty` },
        { key: "departments", label: "Departments & HoDs", icon: "apartment", href: `${BASE}/departments` },
        { key: "higher-education", label: "Higher education", icon: "school", href: `${BASE}/higher-education` },
        { key: "edc", label: "EDC", icon: "rocket_launch", href: `${BASE}/edc` },
      ],
    },
    {
      label: "Institution",
      items: [
        { key: "approvals", label: "Approvals", icon: "fact_check", href: `${BASE}/approvals`, badgeKey: "iqacPendingApprovals" },
      ],
    },
    ...QUALITY_DOMAINS.map((domain) => ({
      label: domain.label,
      items: domain.metrics.map((metric) => ({
        key: `${domain.key}-${metric.key}`,
        label: metric.label,
        icon: metric.icon,
        href: `${BASE}/quality/${domain.key}/${metric.key}`,
      })),
    })),
  ],
};
