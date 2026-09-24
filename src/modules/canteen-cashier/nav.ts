import type { ModuleConfig } from "@/modules/types";

const BASE = "/canteen-cashier";

// Messaging is deliberately excluded for this role too, same as
// canteen-admin/nav.ts and for the same reason: a shared operational
// login, not a person, with no messaging use case — excluded from the
// sidebar here and from the backend's search/send rules in
// messaging.service.ts's MESSAGING_EXCLUDED_ROLES.
export const canteenCashierModuleConfig: ModuleConfig = {
  role: "canteen_cashier",
  basePath: BASE,
  moduleLabel: "Canteen Cashier",
  excludeMessages: true,
  // Runs the canteen rather than buying from it — not a food-ordering customer.
  excludeOrderFood: true,
  // No dashboard page for this role — Billing is the first real screen.
  homeHref: `${BASE}/billing`,
  navGroups: [
    {
      label: "Canteen",
      items: [
        { key: "billing", label: "Billing", icon: "point_of_sale", href: `${BASE}/billing` },
        { key: "online-orders", label: "Online Orders", icon: "moped", href: `${BASE}/online-orders` },
        { key: "bill-management", label: "Bill Management", icon: "receipt_long", href: `${BASE}/bill-management` },
      ],
    },
  ],
};
