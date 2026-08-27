import type { ModuleConfig, NavGroup } from "@/modules/types";

// Nav data for the shared AppShell/Sidebar (see EdcShell.tsx). Icon names
// are literal Material Symbols ligature names, unchanged from the design
// reference the module was originally pixel-ported from — the shared
// Icon component renders them via the Rounded variant instead of this
// module's own Outlined font, which is a font-style change only (every
// ligature name below exists in both variants).
//
// badgeKey is set only where a real live count exists (announcementsCount/
// entrepreneursCount/startupsCount/ideasCount/incubationCount, all wired
// in EdcShell.tsx via navBadges) — Mentors/Funding/Events/Documents/Reports
// have no backing count source, so no badge is fabricated for them.
const EDC_NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { key: "dashboard", label: "Dashboard", icon: "dashboard", href: "/edc/dashboard" },
      { key: "announcements", label: "Announcements", icon: "campaign", href: "/edc/announcements", badgeKey: "edcAnnouncements" },
      { key: "calendar", label: "Academic Calendar", icon: "calendar_month", href: "/edc/calendar" },
    ],
  },
  {
    label: "Entrepreneurs",
    items: [
      { key: "entrepreneurs", label: "EDC Students", icon: "groups", href: "/edc/entrepreneurs", badgeKey: "edcStudents" },
      { key: "add-student", label: "Add Student", icon: "person_add", href: "/edc/add-student" },
      { key: "startups", label: "Startups", icon: "rocket_launch", href: "/edc/startups", badgeKey: "edcStartups" },
      { key: "ideas", label: "Startup Ideas", icon: "lightbulb", href: "/edc/ideas", badgeKey: "edcIdeas" },
    ],
  },
  {
    label: "Support",
    items: [
      { key: "incubation", label: "Incubation", icon: "psychiatry", href: "/edc/incubation", badgeKey: "edcIncubations" },
      { key: "mentors", label: "Mentors", icon: "person_search", href: "/edc/mentors" },
      { key: "funding", label: "Funding", icon: "payments", href: "/edc/funding" },
    ],
  },
  {
    label: "Activity",
    items: [
      { key: "events", label: "Events", icon: "event", href: "/edc/events" },
      { key: "documents", label: "Documents", icon: "description", href: "/edc/documents" },
    ],
  },
  {
    label: "Administration",
    items: [
      { key: "reports", label: "Reports", icon: "monitoring", href: "/edc/reports" },
    ],
  },
];

// Registers the edc_coordinator role with MODULE_REGISTRY (login redirect +
// route guard) — same pattern every other module's nav.ts follows.
// navGroups now feeds the shared Sidebar directly (EdcShell composes
// AppShell), replacing the old EDC_NAV/EdcShell-only aside markup.
export const edcModuleConfig: ModuleConfig = {
  role: "edc_coordinator",
  basePath: "/edc",
  moduleLabel: "EDC Portal",
  navGroups: EDC_NAV_GROUPS,
};
