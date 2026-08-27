import type { ModuleConfig } from "@/modules/types";

const BASE = "/principal";

export const principalModuleConfig: ModuleConfig = {
  role: "principal",
  basePath: BASE,
  moduleLabel: "Principal",
  navGroups: [
    {
      label: "Overview",
      items: [
        { key: "dashboard", label: "Dashboard", icon: "dashboard", href: `${BASE}/dashboard` },
        { key: "reports", label: "Reports & Analytics", icon: "insights", href: `${BASE}/reports` },
        {
          key: "announcements",
          label: "Announcements",
          icon: "campaign",
          href: `${BASE}/announcements`,
          badgeKey: "announcementsRecent",
        },
        { key: "exams", label: "Examinations & results", icon: "quiz", href: `${BASE}/exams` },
        { key: "calendar", label: "Academic calendar", icon: "calendar_month", href: `${BASE}/calendar` },
      ],
    },
    {
      label: "People",
      items: [
        {
          key: "students",
          label: "Students",
          icon: "groups",
          href: `${BASE}/students`,
          badgeKey: "principalStudentsTotal",
        },
        {
          key: "faculty",
          label: "Faculty & staff",
          icon: "badge",
          href: `${BASE}/faculty`,
          badgeKey: "principalFacultyTotal",
        },
        { key: "departments", label: "Departments & HoDs", icon: "account_tree", href: `${BASE}/departments` },
        { key: "role-allocation", label: "Role Allocation", icon: "assignment_ind", href: `${BASE}/role-allocation` },
        { key: "higher-education", label: "Higher education", icon: "school", href: `${BASE}/higher-education` },
        { key: "edc", label: "EDC", icon: "rocket_launch", href: `${BASE}/edc` },
      ],
    },
    {
      label: "Institution",
      items: [
        { key: "approvals", label: "Approvals", icon: "task_alt", href: `${BASE}/approvals` },
        { key: "placements", label: "Placements", icon: "work", href: `${BASE}/placements` },
        { key: "hostel", label: "Hostel", icon: "bed", href: `${BASE}/hostel` },
        { key: "transport", label: "Transport", icon: "directions_bus", href: `${BASE}/transport` },
        { key: "finance", label: "Finance & fees", icon: "account_balance_wallet", href: `${BASE}/finance` },
        { key: "facilities", label: "Campus & facilities", icon: "apartment", href: `${BASE}/facilities` },
      ],
    },
  ],
};
