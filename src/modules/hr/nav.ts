import type { ModuleConfig } from "@/modules/types";

const BASE = "/hr";

export const hrModuleConfig: ModuleConfig = {
  role: "hr_payroll",
  basePath: BASE,
  moduleLabel: "HR & Payroll",
  navGroups: [
    {
      label: "Overview",
      items: [
        { key: "dashboard", label: "Dashboard", icon: "dashboard", href: `${BASE}/dashboard` },
        { key: "announcements", label: "Announcements", icon: "campaign", href: `${BASE}/announcements` },
        { key: "faculty-directory", label: "Faculty directory", icon: "groups", href: `${BASE}/faculty-directory` },
        { key: "departments", label: "Departments", icon: "apartment", href: `${BASE}/departments` },
        { key: "faculty-documents", label: "Documents", icon: "folder_shared", href: `${BASE}/faculty-documents` },
        { key: "requests", label: "Requests", icon: "inbox", href: `${BASE}/requests`, badgeKey: "hrPendingRequests" },
      ],
    },
    {
      label: "Appraisal",
      items: [
        { key: "criteria-library", label: "Criteria library", icon: "layers", href: `${BASE}/criteria-library` },
        {
          key: "employee-reviews",
          label: "Appraisal requests",
          icon: "military_tech",
          href: `${BASE}/employee-reviews`,
          badgeKey: "hrPendingAppraisals",
        },
      ],
    },
    {
      label: "Payroll",
      items: [
        { key: "payroll", label: "Payroll", icon: "payments", href: `${BASE}/payroll` },
        { key: "payslip-requests", label: "Payslip requests", icon: "receipt_long", href: `${BASE}/payslip-requests` },
      ],
    },
    {
      label: "Attendance & leave",
      items: [
        { key: "faculty-attendance", label: "Faculty attendance", icon: "schedule", href: `${BASE}/faculty-attendance` },
        { key: "vacation-management", label: "Vacation management", icon: "event_available", href: `${BASE}/vacation-management` },
      ],
    },
    {
      label: "Other",
      items: [
        { key: "reports", label: "Reports", icon: "monitoring", href: `${BASE}/reports` },
        { key: "form-16", label: "Form 16", icon: "description", href: `${BASE}/form-16` },
      ],
    },
  ],
};
