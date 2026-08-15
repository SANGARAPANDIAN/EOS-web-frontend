import type { ModuleConfig } from "@/modules/types";

/**
 * Registry-facing config — only `basePath` is actually read (by the root
 * page and login page's post-auth redirect). The real nav definition lives
 * in LIBRARY_NAV below since LibrarySidebar has its own item shape (live
 * count badges) rather than the student-shaped shared NavItem type.
 */
export const libraryModuleConfig: ModuleConfig = {
  role: "library",
  basePath: "/library",
  moduleLabel: "Library",
  navGroups: [],
};

export interface LibraryNavItem {
  href: string;
  label: string;
  icon: string;
  /** Populated at render time from live data (e.g. total books in the catalogue) — never hardcoded. */
  badgeKey?: "totalBooks";
}

export interface LibraryNavGroup {
  label: string;
  items: LibraryNavItem[];
}

export const LIBRARY_NAV: LibraryNavGroup[] = [
  {
    label: "Overview",
    items: [{ href: "/library/dashboard", label: "Dashboard", icon: "dashboard" }],
  },
  {
    label: "Catalogue",
    items: [
      { href: "/library/books", label: "Books", icon: "menu_book", badgeKey: "totalBooks" },
      { href: "/library/ebooks", label: "eBooks", icon: "tablet" },
      { href: "/library/catalogue-setup", label: "Categories & racks", icon: "category" },
    ],
  },
  {
    label: "Circulation",
    items: [
      { href: "/library/issue", label: "Issue books", icon: "assignment_turned_in" },
      { href: "/library/returns", label: "Returns & renewals", icon: "assignment_return" },
      { href: "/library/overdue", label: "Overdue & fines", icon: "schedule" },
      { href: "/library/lost", label: "Lost & damaged", icon: "report" },
      { href: "/library/history", label: "Borrowing history", icon: "history" },
    ],
  },
  {
    label: "Members",
    items: [{ href: "/library/members", label: "Library members", icon: "groups" }],
  },
  {
    label: "Administration",
    items: [
      { href: "/library/reports", label: "Reports", icon: "summarize" },
      { href: "/library/settings", label: "Settings", icon: "settings" },
    ],
  },
];

/** Flattens the nav and matches by `startsWith`, defaulting to "Library". */
export function getLibraryPageTitle(pathname: string): string {
  const flat = LIBRARY_NAV.flatMap((g) => g.items);
  const match = flat.find((item) => pathname.startsWith(item.href));
  return match?.label ?? "Library";
}
