// Ported verbatim from the `NAV` array in
// "EDC Module - Web/EDC Portal.dc.html" (design reference). Icon names are
// literal Material Symbols Outlined ligatures, exactly as in the source —
// do not swap for a different icon set. Counts are the design's own literal
// badge values, not yet backed by real data (this module is being built
// skeleton-first per instruction; a later pass replaces these with real
// counts once connected to EOSbackend1).

export interface EdcNavItem {
  id: string;
  label: string;
  icon: string;
  count?: number;
  href: string;
}

export interface EdcNavGroup {
  label: string;
  items: EdcNavItem[];
}

export const EDC_NAV: EdcNavGroup[] = [
  {
    label: "OVERVIEW",
    items: [
      { id: "dashboard", label: "Dashboard", icon: "dashboard", href: "/edc/dashboard" },
      { id: "announcements", label: "Announcements", icon: "campaign", count: 3, href: "/edc/announcements" },
      { id: "calendar", label: "Academic Calendar", icon: "calendar_month", href: "/edc/calendar" },
    ],
  },
  {
    label: "ENTREPRENEURS",
    items: [
      { id: "entrepreneurs", label: "EDC Students", icon: "groups", count: 12, href: "/edc/entrepreneurs" },
      { id: "add-student", label: "Add Student", icon: "person_add", href: "/edc/add-student" },
      { id: "startups", label: "Startups", icon: "rocket_launch", count: 9, href: "/edc/startups" },
      { id: "ideas", label: "Startup Ideas", icon: "lightbulb", count: 14, href: "/edc/ideas" },
    ],
  },
  {
    label: "SUPPORT",
    items: [
      { id: "incubation", label: "Incubation", icon: "psychiatry", href: "/edc/incubation" },
      { id: "mentors", label: "Mentors", icon: "person_search", href: "/edc/mentors" },
      { id: "funding", label: "Funding", icon: "payments", href: "/edc/funding" },
    ],
  },
  {
    label: "ACTIVITY",
    items: [
      { id: "events", label: "Events", icon: "event", href: "/edc/events" },
      { id: "documents", label: "Documents", icon: "description", href: "/edc/documents" },
    ],
  },
  {
    label: "ADMINISTRATION",
    items: [
      { id: "reports", label: "Reports", icon: "monitoring", href: "/edc/reports" },
    ],
  },
];

/** Flat id → item lookup, mirrors the design's NAV_INDEX. */
export const EDC_NAV_INDEX: Record<string, EdcNavItem> = Object.fromEntries(
  EDC_NAV.flatMap((g) => g.items).map((item) => [item.id, item]),
);

// Registers the edc_coordinator role with MODULE_REGISTRY (login redirect +
// route guard) — same compat-shim pattern as advisorModuleConfig in
// modules/advisor/nav.ts. navGroups is intentionally empty: EdcShell renders
// from EDC_NAV above, not the generic AppShell/Sidebar.
export const edcModuleConfig = {
  role: "edc_coordinator",
  basePath: "/edc",
  moduleLabel: "EDC Portal",
  navGroups: [],
};
