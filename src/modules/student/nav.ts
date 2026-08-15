import type { ModuleConfig } from "@/modules/types";

const BASE = "/student";

export const studentModuleConfig: ModuleConfig = {
  role: "student",
  basePath: BASE,
  moduleLabel: "Student",
  navGroups: [
    {
      label: "Overview",
      items: [
        { key: "dashboard", label: "Dashboard", icon: "grid_view", href: `${BASE}/dashboard` },
        {
          key: "announcements",
          label: "Announcements",
          icon: "campaign",
          href: `${BASE}/announcements`,
          badgeKey: "announcementsRecent",
        },
      ],
    },
    {
      label: "Academics",
      items: [
        { key: "attendance", label: "Attendance", icon: "fact_check", href: `${BASE}/attendance` },
        { key: "performance", label: "Performance", icon: "workspace_premium", href: `${BASE}/performance` },
        { key: "timetable", label: "Timetable", icon: "calendar_view_week", href: `${BASE}/timetable` },
        { key: "calendar", label: "Calendar", icon: "calendar_month", href: `${BASE}/calendar` },
        { key: "lms", label: "LMS", icon: "menu_book", href: `${BASE}/lms` },
        { key: "placements", label: "Placements", icon: "work", href: `${BASE}/placements` },
        { key: "exam-schedule", label: "Exam schedule", icon: "event_note", href: `${BASE}/exam-schedule` },
        { key: "fees", label: "Fees", icon: "payments", href: `${BASE}/fees`, badgeKey: "feesDue" },
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
        { key: "hostel", label: "Hostel", icon: "apartment", href: `${BASE}/hostel` },
        { key: "inout", label: "In / out request", icon: "swap_horiz", href: `${BASE}/inout` },
        { key: "library", label: "Library", icon: "local_library", href: `${BASE}/library` },
        {
          key: "feedback",
          label: "Feedback",
          icon: "reviews",
          href: `${BASE}/feedback`,
          badgeKey: "feedbackPending",
        },
      ],
    },
  ],
};
