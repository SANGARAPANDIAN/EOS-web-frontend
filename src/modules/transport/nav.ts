import type { ModuleConfig } from "@/modules/types";

const BASE = "/transport";

export const transportModuleConfig: ModuleConfig = {
  role: "transport",
  basePath: BASE,
  moduleLabel: "Transport",
  navGroups: [
    {
      label: "Overview",
      items: [{ key: "dashboard", label: "Dashboard", icon: "dashboard", href: `${BASE}/dashboard` }],
    },
    {
      label: "Fleet",
      items: [
        { key: "buses", label: "Buses", icon: "directions_bus", href: `${BASE}/buses`, badgeKey: "fleetBuses" },
        { key: "routes", label: "Routes", icon: "alt_route", href: `${BASE}/routes`, badgeKey: "fleetRoutes" },
      ],
    },
    {
      label: "People",
      items: [{ key: "drivers", label: "Drivers & crew", icon: "groups", href: `${BASE}/drivers`, badgeKey: "crewCount" }],
    },
    {
      label: "Operations",
      items: [
        { key: "maintenance", label: "Maintenance", icon: "build", href: `${BASE}/maintenance`, badgeKey: "maintenanceDue" },
        { key: "compliance", label: "Compliance", icon: "description", href: `${BASE}/compliance`, badgeKey: "complianceExpiring" },
      ],
    },
  ],
};
