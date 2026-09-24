import type { ModuleConfig } from "@/modules/types";

const BASE = "/parent";

export const parentModuleConfig: ModuleConfig = {
  role: "parent",
  basePath: BASE,
  moduleLabel: "Parent",
  // Parent has no wallet at all (WalletController's WALLET_ROLES excludes
  // only Parent) — Order Food follows the same exclusion (see registry.ts).
  excludeOrderFood: true,
  navGroups: [
    {
      label: "Overview",
      items: [
        { key: "dashboard", label: "Dashboard", icon: "grid_view", href: `${BASE}/dashboard` },
        { key: "announcements", label: "Notices", icon: "campaign", href: `${BASE}/announcements` },
      ],
    },
    {
      label: "Academics",
      items: [
        { key: "attendance", label: "Attendance", icon: "fact_check", href: `${BASE}/attendance` },
        { key: "performance", label: "Performance", icon: "workspace_premium", href: `${BASE}/performance` },
        { key: "timetable", label: "Timetable", icon: "calendar_view_week", href: `${BASE}/timetable` },
        { key: "calendar", label: "Academic Calendar", icon: "calendar_month", href: `${BASE}/calendar` },
        { key: "lms", label: "LMS", icon: "menu_book", href: `${BASE}/lms` },
        { key: "placements", label: "Placements", icon: "work", href: `${BASE}/placements`, careerPath: "placement" },
        { key: "exam-schedule", label: "Exam schedule", icon: "event_note", href: `${BASE}/exam-schedule` },
        { key: "fees", label: "Fees", icon: "payments", href: `${BASE}/fees` },
      ],
    },
    {
      label: "Requests",
      items: [
        { key: "leave", label: "Leave", icon: "event_busy", href: `${BASE}/leave` },
        { key: "od", label: "On duty", icon: "flight_takeoff", href: `${BASE}/od` },
        { key: "bonafide", label: "Bonafide", icon: "draft", href: `${BASE}/bonafide` },
        { key: "nodue", label: "No due", icon: "task_alt", href: `${BASE}/no-due` },
      ],
    },
    {
      label: "Campus",
      items: [
        { key: "hostel", label: "Hostel", icon: "apartment", href: `${BASE}/hostel`, hostellerOnly: true },
        { key: "inout", label: "In / out request", icon: "swap_horiz", href: `${BASE}/inout` },
        { key: "food-court", label: "Food Court", icon: "restaurant", href: `${BASE}/food-court` },
        { key: "library", label: "Library", icon: "local_library", href: `${BASE}/library` },
        { key: "medical", label: "Medical", icon: "medical_services", href: `${BASE}/medical` },
        { key: "my-venture", label: "My Venture", icon: "rocket_launch", href: `${BASE}/my-venture`, careerPath: "venture" },
        { key: "higher-studies", label: "Higher Studies", icon: "school", href: `${BASE}/higher-studies`, careerPath: "higher_studies" },
      ],
    },
  ],
};
