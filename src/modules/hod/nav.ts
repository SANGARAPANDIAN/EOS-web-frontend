import type { ModuleConfig } from "@/modules/types";

const BASE = "/hod";

export const hodModuleConfig: ModuleConfig = {
  role: "hod",
  basePath: BASE,
  moduleLabel: "HoD",
  navGroups: [
    {
      label: "Overview",
      items: [
        { key: "dashboard", label: "Dashboard", icon: "dashboard", href: `${BASE}/dashboard` },
        { key: "reports-analytics", label: "Reports & Analytics", icon: "monitoring", href: `${BASE}/reports-analytics` },
        { key: "announcements", label: "Announcements", icon: "campaign", href: `${BASE}/announcements` },
        { key: "academic-calendar", label: "Academic Calendar", icon: "calendar_month", href: `${BASE}/academic-calendar` },
      ],
    },
    {
      label: "Department",
      items: [
        { key: "class-records", label: "Class Records", icon: "folder_shared", href: `${BASE}/class-records` },
        {
          key: "faculty-staff",
          label: "Faculty & Staff",
          icon: "groups",
          href: `${BASE}/faculty-staff`,
          badgeKey: "facultyCount",
        },
        { key: "examinations-results", label: "Examinations & Results", icon: "school", href: `${BASE}/examinations-results` },
        {
          key: "leave-requests",
          label: "Leave Requests",
          icon: "event_busy",
          href: `${BASE}/leave-requests`,
          badgeKey: "leaveRequestsPending",
        },
        {
          key: "od-requests",
          label: "OD Requests",
          icon: "directions_walk",
          href: `${BASE}/od-requests`,
          badgeKey: "odRequestsPending",
        },
        { key: "no-due", label: "No-Due", icon: "verified", href: `${BASE}/no-due` },
        { key: "placements", label: "Placements", icon: "work", href: `${BASE}/placements` },
        { key: "higher-education", label: "Higher Education", icon: "auto_stories", href: `${BASE}/higher-education` },
        { key: "edc", label: "EDC", icon: "lightbulb", href: `${BASE}/edc` },
        { key: "assign-faculty", label: "Assign Faculty", icon: "person_add", href: `${BASE}/assign-faculty` },
        { key: "timetable", label: "Timetable Allocation", icon: "schedule", href: `${BASE}/timetable` },
        { key: "appraisal-requests", label: "Appraisal Requests", icon: "military_tech", href: `${BASE}/appraisal-requests` },
        { key: "sop-pop-requests", label: "SOP/POP Requests", icon: "description", href: `${BASE}/sop-pop-requests` },
      ],
    },
    {
      label: "My Class",
      items: [
        { key: "my-class-attendance", label: "Attendance", icon: "fact_check", href: `${BASE}/my-class/attendance` },
        { key: "current-semester", label: "LMS", icon: "date_range", href: `${BASE}/my-class/current-semester` },
        { key: "subject-records", label: "Subject Records", icon: "menu_book", href: `${BASE}/my-class/subject-records` },
        { key: "assignment-status", label: "Assignment Status", icon: "assignment_turned_in", href: `${BASE}/my-class/assignment-status` },
      ],
    },
    {
      label: "Employee",
      items: [
        { key: "employee-attendance", label: "Attendance", icon: "checklist", href: `${BASE}/employee/attendance` },
        { key: "employee-timetable", label: "Timetable", icon: "calendar_view_week", href: `${BASE}/employee/timetable` },
        { key: "employee-leave", label: "Leave", icon: "beach_access", href: `${BASE}/employee/leave` },
        { key: "employee-od", label: "OD", icon: "directions_walk", href: `${BASE}/employee/od` },
        { key: "employee-venue", label: "Venue", icon: "location_on", href: `${BASE}/employee/venue` },
        { key: "employee-hr-payroll", label: "HR Payroll", icon: "payments", href: `${BASE}/employee/hr-payroll` },
        { key: "employee-payslip", label: "Payslip", icon: "receipt_long", href: `${BASE}/employee/payslip` },
        { key: "employee-appraisal", label: "Appraisal", icon: "trending_up", href: `${BASE}/employee/appraisal` },
        { key: "employee-library", label: "Library", icon: "local_library", href: `${BASE}/employee/library` },
      ],
    },
  ],
};
