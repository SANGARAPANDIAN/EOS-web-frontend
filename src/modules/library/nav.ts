import type { ModuleConfig } from "@/modules/types";

const BASE = "/library";

export const libraryModuleConfig: ModuleConfig = {
  role: "library",
  basePath: BASE,
  moduleLabel: "Library",
  navGroups: [
    {
      label: "Overview",
      items: [{ key: "dashboard", label: "Dashboard", icon: "dashboard", href: `${BASE}/dashboard` }],
    },
    {
      label: "Catalogue",
      items: [
        { key: "books", label: "Books", icon: "menu_book", href: `${BASE}/books`, badgeKey: "totalBooks" },
        { key: "ebooks", label: "eBooks", icon: "tablet", href: `${BASE}/ebooks` },
        { key: "catalogue-setup", label: "Categories & racks", icon: "category", href: `${BASE}/catalogue-setup` },
      ],
    },
    {
      label: "Circulation",
      items: [
        { key: "issue", label: "Issue books", icon: "assignment_turned_in", href: `${BASE}/issue` },
        { key: "returns", label: "Returns & renewals", icon: "assignment_return", href: `${BASE}/returns` },
        { key: "overdue", label: "Overdue & fines", icon: "schedule", href: `${BASE}/overdue` },
        { key: "lost", label: "Lost & damaged", icon: "report", href: `${BASE}/lost` },
        { key: "history", label: "Borrowing history", icon: "history", href: `${BASE}/history` },
      ],
    },
    {
      label: "Members",
      items: [{ key: "members", label: "Library members", icon: "groups", href: `${BASE}/members` }],
    },
    {
      label: "Administration",
      items: [
        { key: "reports", label: "Reports", icon: "summarize", href: `${BASE}/reports` },
        { key: "settings", label: "Settings", icon: "settings", href: `${BASE}/settings` },
      ],
    },
  ],
};
