import type { ModuleConfig } from "@/modules/types";

const BASE = "/sports-admin";

export const sportsAdminModuleConfig: ModuleConfig = {
  role: "sports_admin",
  basePath: BASE,
  moduleLabel: "Sports",
  navGroups: [
    {
      label: "Overview",
      items: [
        { key: "dashboard", label: "Dashboard", icon: "grid_view", href: `${BASE}/dashboard` },
        { key: "reports", label: "Reports & analytics", icon: "monitoring", href: `${BASE}/reports` },
        { key: "announcements", label: "Announcements", icon: "campaign", href: `${BASE}/announcements` },
        { key: "calendar", label: "Calendar", icon: "calendar_month", href: `${BASE}/calendar` },
        { key: "fixtures", label: "Fixtures", icon: "sports_score", href: `${BASE}/fixtures` },
      ],
    },
    {
      label: "Athletes",
      items: [
        { key: "athletes", label: "Athletes", icon: "sports_gymnastics", href: `${BASE}/athletes`, badgeKey: "sportsAthletes" },
        { key: "teams", label: "Teams & squads", icon: "groups_2", href: `${BASE}/teams`, badgeKey: "sportsTeams" },
        {
          key: "trials",
          label: "Trials & selection",
          icon: "assignment_turned_in",
          href: `${BASE}/trials`,
          badgeKey: "sportsTrialsPending",
        },
        { key: "od", label: "On-duty (OD)", icon: "flight_takeoff", href: `${BASE}/od`, badgeKey: "sportsOdPending" },
      ],
    },
    {
      label: "Programs",
      items: [
        {
          key: "disciplines",
          label: "Disciplines",
          icon: "sports_soccer",
          href: `${BASE}/disciplines`,
          badgeKey: "sportsDisciplines",
        },
        { key: "sessions", label: "Training sessions", icon: "schedule", href: `${BASE}/sessions` },
        {
          key: "achievements",
          label: "Achievements",
          icon: "emoji_events",
          href: `${BASE}/achievements`,
          badgeKey: "sportsAchievements",
        },
        { key: "fitness", label: "Fitness & health", icon: "monitor_heart", href: `${BASE}/fitness` },
      ],
    },
    {
      label: "Resources",
      items: [
        { key: "coaches", label: "Coaches & staff", icon: "sports", href: `${BASE}/coaches` },
        { key: "facilities", label: "Facilities & grounds", icon: "stadium", href: `${BASE}/facilities` },
        { key: "equipment", label: "Equipment & kit", icon: "inventory_2", href: `${BASE}/equipment` },
        { key: "budget", label: "Budget & approvals", icon: "request_quote", href: `${BASE}/budget` },
        { key: "injuries", label: "Injuries & incidents", icon: "healing", href: `${BASE}/injuries` },
      ],
    },
  ],
};
