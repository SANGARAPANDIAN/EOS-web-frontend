// Ported from the sidebar in "Billing Module - Web/Billing Admin.dc.html"
// (lines 94-187). BILLING_NAV below is the semantic source of truth (used
// to derive navGroups for the shared AppShell/Sidebar); its `icon` tokens
// map to real Material Symbols Rounded ligature names via ICON_MAP since
// the shared Sidebar renders through the shared `Icon` component now, not
// the old hand-drawn BillingIcon SVGs.

import type { ModuleConfig, NavBadgeKey } from "@/modules/types";

export interface BillingNavItem {
  id: string;
  label: string;
  icon: string;
  badgeKey?: "students" | "concessions" | "dd";
  href: string;
}

export interface BillingNavGroup {
  label: string;
  items: BillingNavItem[];
}

export const BILLING_NAV: BillingNavGroup[] = [
  {
    label: "Overview",
    items: [
      { id: "dashboard", label: "Dashboard", icon: "dashboard", href: "/billing/dashboard" },
      { id: "announcements", label: "Announcements", icon: "megaphone", href: "/billing/announcements" },
    ],
  },
  {
    label: "People",
    items: [
      { id: "students", label: "Students", icon: "students", badgeKey: "students", href: "/billing/students" },
    ],
  },
  {
    label: "Billing",
    items: [
      { id: "overview", label: "Finance Overview", icon: "overview", href: "/billing/overview" },
      { id: "payments", label: "Fee Payments", icon: "payments", badgeKey: "students", href: "/billing/payments" },
      { id: "demand", label: "Demand", icon: "demand", href: "/billing/demand" },
      { id: "receipts", label: "Receipts", icon: "receipts", href: "/billing/receipts" },
    ],
  },
  {
    label: "Masters",
    items: [
      { id: "quota", label: "Quota", icon: "quota", href: "/billing/quota" },
      { id: "structures", label: "Fee Structures", icon: "structures", href: "/billing/structures" },
      { id: "items", label: "Fee Structure Items", icon: "items", href: "/billing/items" },
    ],
  },
  {
    label: "Operations",
    items: [
      { id: "concessions", label: "Concessions", icon: "concessions", badgeKey: "concessions", href: "/billing/concessions" },
      { id: "loans", label: "Education Loan DD", icon: "loans", badgeKey: "dd", href: "/billing/loans" },
    ],
  },
  {
    label: "Insights",
    items: [
      { id: "reports", label: "Reports", icon: "reports", href: "/billing/reports" },
      { id: "audit", label: "Audit Log", icon: "audit", href: "/billing/audit" },
    ],
  },
];

// Semantic BILLING_NAV icon token -> real Material Symbols Rounded ligature
// name, for the shared Icon component. Cosmetic picks, not load-bearing.
const ICON_MAP: Record<string, string> = {
  dashboard: "dashboard",
  megaphone: "campaign",
  students: "group",
  overview: "grid_view",
  payments: "payments",
  demand: "receipt_long",
  receipts: "receipt_long",
  quota: "pie_chart",
  structures: "account_tree",
  items: "inventory_2",
  concessions: "percent",
  loans: "account_balance",
  reports: "bar_chart",
  audit: "fact_check",
};

// Local BILLING_NAV badgeKey -> shared NavBadgeKey union member.
const BADGE_KEY_MAP: Record<NonNullable<BillingNavItem["badgeKey"]>, NavBadgeKey> = {
  students: "billingStudents",
  concessions: "billingConcessions",
  dd: "billingDD",
};

export const billingModuleConfig: ModuleConfig = {
  role: "billing",
  basePath: "/billing",
  moduleLabel: "Billing Portal",
  navGroups: BILLING_NAV.map((group) => ({
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
