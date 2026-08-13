import type { ModuleConfig } from "@/modules/types";

const BASE = "/hod";

/**
 * No `icon` on any item — confirmed by reading the HoD design reference
 * (HOD Portal.dc.html) directly: unlike the Student reference, it uses no
 * icon font/library anywhere. Sidebar renders nothing in its place when
 * `icon` is omitted (see components/layout/Sidebar.tsx).
 */
export const hodModuleConfig: ModuleConfig = {
  role: "hod",
  basePath: BASE,
  moduleLabel: "HoD",
  navGroups: [
    {
      label: "Overview",
      items: [
        { key: "dashboard", label: "Dashboard", href: `${BASE}/dashboard` },
        { key: "reports-analytics", label: "Reports & Analytics", href: `${BASE}/reports-analytics` },
        { key: "announcements", label: "Announcements", href: `${BASE}/announcements` },
        { key: "academic-calendar", label: "Academic Calendar", href: `${BASE}/academic-calendar` },
      ],
    },
    {
      label: "Department",
      items: [
        { key: "class-records", label: "Class Records", href: `${BASE}/class-records` },
        {
          key: "faculty-staff",
          label: "Faculty & Staff",
          href: `${BASE}/faculty-staff`,
          badgeKey: "facultyCount",
        },
        { key: "examinations-results", label: "Examinations & Results", href: `${BASE}/examinations-results` },
        {
          key: "leave-requests",
          label: "Leave Requests",
          href: `${BASE}/leave-requests`,
          badgeKey: "leaveRequestsPending",
        },
        {
          key: "od-requests",
          label: "OD Requests",
          href: `${BASE}/od-requests`,
          badgeKey: "odRequestsPending",
        },
        { key: "no-due", label: "No-Due", href: `${BASE}/no-due` },
        { key: "placements", label: "Placements", href: `${BASE}/placements` },
        { key: "higher-education", label: "Higher Education", href: `${BASE}/higher-education` },
        { key: "edc", label: "EDC", href: `${BASE}/edc` },
        { key: "assign-faculty", label: "Assign Faculty", href: `${BASE}/assign-faculty` },
        { key: "timetable", label: "Timetable", href: `${BASE}/timetable` },
        { key: "appraisal-requests", label: "Appraisal Requests", href: `${BASE}/appraisal-requests` },
        { key: "sop-pop-requests", label: "SOP/POP Requests", href: `${BASE}/sop-pop-requests` },
      ],
    },
    {
      label: "My Class",
      items: [
        { key: "my-class-attendance", label: "Attendance", href: `${BASE}/my-class/attendance` },
        { key: "current-semester", label: "Current Semester", href: `${BASE}/my-class/current-semester` },
        { key: "subject-records", label: "Subject Records", href: `${BASE}/my-class/subject-records` },
        { key: "assignment-status", label: "Assignment Status", href: `${BASE}/my-class/assignment-status` },
      ],
    },
    {
      label: "Employee",
      items: [
        { key: "employee-attendance", label: "Attendance", href: `${BASE}/employee/attendance` },
        { key: "employee-timetable", label: "Timetable", href: `${BASE}/employee/timetable` },
        { key: "employee-leave", label: "Leave", href: `${BASE}/employee/leave` },
        { key: "employee-od", label: "OD", href: `${BASE}/employee/od` },
        { key: "employee-venue", label: "Venue", href: `${BASE}/employee/venue` },
        { key: "employee-hr-payroll", label: "HR Payroll", href: `${BASE}/employee/hr-payroll` },
        { key: "employee-payslip", label: "Payslip", href: `${BASE}/employee/payslip` },
        { key: "employee-appraisal", label: "Appraisal", href: `${BASE}/employee/appraisal` },
        { key: "employee-library", label: "Library", href: `${BASE}/employee/library` },
      ],
    },
  ],
};
