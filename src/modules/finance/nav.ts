// Sidebar definition for the Finance portal. Same group/item shape and the
// same rendering contract as the other portals' navs, so the chrome stays
// identical across the platform.
//
// Tracking and History are deliberately NOT separate sidebar entries: each
// order kind has one destination, and the page itself carries a Tracking /
// History switch. Two sidebar rows per kind (four in total) made the list long
// and pushed the real sections down for no benefit.
//
// FINANCE_NAV below is the semantic source of truth (used to derive
// navGroups for the shared AppShell/Sidebar); its `icon` tokens map to real
// Material Symbols Rounded ligature names via ICON_MAP, and its badgeKey
// tokens map to the shared NavBadgeKey union via BADGE_KEY_MAP — same
// pattern as the Billing module's nav.ts.

import type { ModuleConfig, NavBadgeKey } from "@/modules/types";

export interface FinanceNavItem {
  id: string;
  label: string;
  icon: string;
  badgeKey?: "popPending" | "sopPending" | "awaitingAllotment" | "feeOutstanding";
  href: string;
}

export interface FinanceNavGroup {
  label: string;
  items: FinanceNavItem[];
}

export const FINANCE_NAV: FinanceNavGroup[] = [
  {
    // Dashboard, the fund itself, then announcements — the three things that
    // are about the whole institution rather than a single queue. Finance
    // Overview lives here rather than under its own "Funds" heading, which was
    // a group of one.
    label: "Overview",
    items: [
      { id: "dashboard", label: "Dashboard", icon: "dashboard", href: "/finance/dashboard" },
      { id: "overview", label: "Finance Overview", icon: "overview", href: "/finance/overview" },
      { id: "announcements", label: "Announcements", icon: "megaphone", href: "/finance/announcements" },
    ],
  },
  {
    label: "Approvals",
    items: [
      { id: "pop-approval", label: "POP Approval", icon: "approve", badgeKey: "popPending", href: "/finance/pop-approval" },
      { id: "sop-approval", label: "SOP Approval", icon: "service", badgeKey: "sopPending", href: "/finance/sop-approval" },
    ],
  },
  {
    label: "Tracking & History",
    items: [
      { id: "pop", label: "POP", icon: "truck", badgeKey: "awaitingAllotment", href: "/finance/pop-tracking" },
      { id: "sop", label: "SOP", icon: "wrench", href: "/finance/sop-tracking" },
    ],
  },
  {
    label: "Fees",
    items: [
      { id: "fees", label: "Fees Overview", icon: "wallet", href: "/finance/fees" },
      { id: "fees-students", label: "Students", icon: "faculty", badgeKey: "feeOutstanding", href: "/finance/fees/students" },
    ],
  },
];

// Semantic FINANCE_NAV icon token -> real Material Symbols Rounded ligature
// name, for the shared Icon component. Cosmetic picks, not load-bearing.
const ICON_MAP: Record<string, string> = {
  dashboard: "dashboard",
  overview: "grid_view",
  megaphone: "campaign",
  approve: "fact_check",
  service: "build",
  truck: "local_shipping",
  wrench: "handyman",
  wallet: "account_balance_wallet",
  faculty: "group",
};

// Local FINANCE_NAV badgeKey -> shared NavBadgeKey union member.
const BADGE_KEY_MAP: Record<NonNullable<FinanceNavItem["badgeKey"]>, NavBadgeKey> = {
  popPending: "financePopPending",
  sopPending: "financeSopPending",
  awaitingAllotment: "financeAwaitingAllotment",
  feeOutstanding: "financeFeeOutstanding",
};

export const financeModuleConfig: ModuleConfig = {
  role: "finance",
  basePath: "/finance",
  moduleLabel: "Finance Portal",
  navGroups: FINANCE_NAV.map((group) => ({
    label: group.label,
    items: group.items.map((item) => ({
      key: item.id,
      label: item.label,
      icon: ICON_MAP[item.icon] ?? item.icon,
      href: item.href,
      badgeKey: item.badgeKey ? BADGE_KEY_MAP[item.badgeKey] : undefined,
    })),
  })),
};
