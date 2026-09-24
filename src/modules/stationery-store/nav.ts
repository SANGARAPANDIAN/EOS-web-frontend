import type { ModuleConfig } from "@/modules/types";

// Nav follows "Stationery Admin.dc.html"'s sidebar (Dashboard, Products,
// Orders, Reports) — a separate role/login from the print-shop's
// "stationary" portal (@/modules/stationary), by explicit product decision:
// not the same counter/staff, must not share a login or a nav tree.

const BASE = "/stationery-store";

export const stationeryStoreModuleConfig: ModuleConfig = {
  role: "stationery",
  basePath: BASE,
  moduleLabel: "Stationery Store",
  // Counter/vendor-style account, no messaging use case of its own — same
  // reasoning as the print-shop's stationaryModuleConfig.
  hideMessagesNav: true,
  navGroups: [
    {
      label: "",
      items: [
        { key: "dashboard", label: "Dashboard", icon: "dashboard", href: `${BASE}/dashboard` },
        { key: "products", label: "Products", icon: "inventory_2", href: `${BASE}/products`, badgeKey: "stationeryLowStock" },
        { key: "orders", label: "Orders", icon: "receipt_long", href: `${BASE}/orders`, badgeKey: "stationeryPendingOrders" },
        { key: "reports", label: "Reports", icon: "trending_up", href: `${BASE}/reports` },
      ],
    },
  ],
};
