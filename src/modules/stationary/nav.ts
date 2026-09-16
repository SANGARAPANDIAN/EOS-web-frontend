import type { ModuleConfig } from "@/modules/types";

// Nav structure follows "Stationery Portal.dc.html"'s sidebar (navItems,
// lines 730-736): Dashboard, Print Requests, Announcements, Operations,
// Reports.

const BASE = "/stationary";

export const stationaryModuleConfig: ModuleConfig = {
  role: "stationary",
  basePath: BASE,
  moduleLabel: "Stationary Portal",
  // The vendor account has no messaging use case of its own (it's a
  // print-shop counter role, not a student/staff account that DMs people) —
  // opt out of AppShell's shared "Messages" nav item.
  hideMessagesNav: true,
  navGroups: [
    {
      label: "Overview",
      items: [{ key: "dashboard", label: "Dashboard", icon: "dashboard", href: `${BASE}/dashboard` }],
    },
    {
      label: "Print shop",
      items: [
        {
          key: "requests",
          label: "Print Requests",
          icon: "print",
          href: `${BASE}/requests`,
          badgeKey: "stationaryPendingRequests",
        },
        { key: "announcements", label: "Announcements", icon: "campaign", href: `${BASE}/announcements` },
        {
          key: "operations",
          label: "Operations",
          icon: "settings",
          href: `${BASE}/operations`,
          badgeKey: "stationaryMachinesDown",
        },
        { key: "reports", label: "Reports", icon: "trending_up", href: `${BASE}/reports` },
      ],
    },
  ],
};
