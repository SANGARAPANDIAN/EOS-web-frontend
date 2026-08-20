import type { ModuleConfig } from "@/modules/types";

const BASE = "/hostel-warden";

export const hostelWardenModuleConfig: ModuleConfig = {
  role: "warden",
  basePath: BASE,
  moduleLabel: "Hostel warden",
  navGroups: [
    {
      label: "Overview",
      items: [
        { key: "dashboard", label: "Dashboard", icon: "dashboard", href: `${BASE}/dashboard` },
        { key: "announcements", label: "Announcements", icon: "campaign", href: `${BASE}/announcements` },
        { key: "roll-call", label: "Night attendance", icon: "fingerprint", href: `${BASE}/roll-call` },
      ],
    },
    {
      label: "Requests",
      items: [
        { key: "gate-log", label: "In / out log", icon: "swap_horiz", href: `${BASE}/gate-log` },
        { key: "passes", label: "Gate passes", icon: "badge", href: `${BASE}/passes`, badgeKey: "hwPendingPasses" },
        { key: "leave", label: "Leave requests", icon: "event_available", href: `${BASE}/leave`, badgeKey: "hwPendingLeave" },
        { key: "complaints", label: "Complaints", icon: "report", href: `${BASE}/complaints`, badgeKey: "hwOpenComplaints" },
      ],
    },
    {
      label: "Hostel",
      items: [
        { key: "residents", label: "Students", icon: "groups", href: `${BASE}/residents` },
        { key: "rooms", label: "Rooms & allotment", icon: "meeting_room", href: `${BASE}/rooms` },
        { key: "mess", label: "Mess", icon: "restaurant", href: `${BASE}/mess` },
        { key: "fees", label: "Fees & dues", icon: "payments", href: `${BASE}/fees` },
      ],
    },
  ],
};
