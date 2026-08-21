import type { ModuleConfig } from "@/modules/types";

const BASE = "/gate-warden";

export const gateWardenModuleConfig: ModuleConfig = {
  role: "gate_warden",
  basePath: BASE,
  moduleLabel: "Gate warden",
  navGroups: [
    {
      label: "Gate",
      items: [
        { key: "dashboard", label: "Gate desk", icon: "shield_person", href: `${BASE}/dashboard` },
        { key: "history", label: "Movement history", icon: "history", href: `${BASE}/history` },
      ],
    },
  ],
};
