import type { ModuleConfig } from "@/modules/types";

const BASE = "/canteen-admin";

// Messaging is deliberately excluded for this role — per explicit user
// direction, Canteen Admin doesn't use messaging at all, and must not even
// be discoverable in anyone else's "search people to message" results (see
// messaging.service.ts's searchPeople() — filtered out at the query level,
// same pattern as the student-to-student exclusion).
export const canteenAdminModuleConfig: ModuleConfig = {
  role: "canteen_admin",
  basePath: BASE,
  moduleLabel: "Canteen Admin",
  excludeMessages: true,
  // Runs the canteen rather than buying from it — not a food-ordering customer.
  excludeOrderFood: true,
  navGroups: [
    {
      label: "Canteen",
      items: [
        { key: "dashboard", label: "Dashboard", icon: "dashboard", href: `${BASE}/dashboard` },
        { key: "orders", label: "Orders", icon: "receipt_long", href: `${BASE}/orders` },
        { key: "reports", label: "Reports", icon: "bar_chart", href: `${BASE}/reports` },
        { key: "expenses", label: "Expense Management", icon: "payments", href: `${BASE}/expenses` },
        { key: "ingredients", label: "Ingredients", icon: "inventory_2", href: `${BASE}/ingredients` },
        { key: "recipes", label: "Recipes", icon: "soup_kitchen", href: `${BASE}/recipes` },
        { key: "dishes", label: "Dishes", icon: "restaurant", href: `${BASE}/dishes` },
        { key: "todays-special", label: "Today's Special", icon: "star", href: `${BASE}/todays-special` },
        { key: "settings", label: "Settings", icon: "settings", href: `${BASE}/settings` },
      ],
    },
  ],
};
