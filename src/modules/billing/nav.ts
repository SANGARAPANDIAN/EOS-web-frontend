// Ported verbatim from the sidebar in
// "Billing Module - Web/Billing Admin.dc.html" (lines 94-187). Fake-data
// skeleton pass — pixel-exact frontend first, real EOSbackend1 wiring is a
// later pass, same process used for the Secretary/EDC modules.

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

// Compat-shim registration (same pattern as edcModuleConfig/
// secretaryModuleConfig in their own nav.ts) — navGroups intentionally
// empty since BillingShell renders from BILLING_NAV above, not the
// generic AppShell/Sidebar.
export const billingModuleConfig = {
  role: "billing",
  basePath: "/billing",
  moduleLabel: "Billing Portal",
  navGroups: [],
};
