import type { ModuleConfig } from "@/modules/types";

const BASE = "/media-room";

export const mediaRoomModuleConfig: ModuleConfig = {
  role: "media_room",
  basePath: BASE,
  moduleLabel: "Media room",
  navGroups: [
    {
      label: "Overview",
      items: [
        { key: "dashboard", label: "Dashboard", icon: "dashboard", href: `${BASE}/dashboard` },
        { key: "calendar", label: "Academic calendar", icon: "event", href: `${BASE}/calendar`, badgeKey: "mrUpcomingEvents" },
        { key: "report", label: "Report", icon: "bar_chart", href: `${BASE}/report` },
      ],
    },
    {
      label: "Production",
      items: [
        { key: "requests", label: "Media requests", icon: "campaign", href: `${BASE}/requests`, badgeKey: "mrPendingRequests" },
        { key: "social", label: "Social media publishing", icon: "share", href: `${BASE}/publishing` },
        { key: "shoots", label: "Shoot assignments", icon: "photo_camera", href: `${BASE}/shoots` },
      ],
    },
    {
      label: "Resources",
      items: [
        { key: "inventory", label: "Inventory", icon: "inventory_2", href: `${BASE}/inventory` },
        { key: "indent", label: "Raise indent", icon: "assignment", href: `${BASE}/indents`, badgeKey: "mrPendingIndents" },
        { key: "team", label: "Media team", icon: "groups", href: `${BASE}/team` },
      ],
    },
  ],
};
