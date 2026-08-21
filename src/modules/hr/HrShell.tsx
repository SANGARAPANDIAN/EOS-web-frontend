"use client";

import { AppShell } from "@/components/layout/AppShell";
import { hrModuleConfig } from "@/modules/hr/nav";
import { useHrDashboard } from "@/modules/hr/api/dashboard";

export function HrShell({ children }: { children: React.ReactNode }) {
  const dashboard = useHrDashboard();

  return (
    <AppShell
      moduleConfig={hrModuleConfig}
      header={{
        studentName: "HR & Payroll",
        registerNumber: dashboard.data ? `${dashboard.data.payroll.total_active_faculty} faculty on roll` : undefined,
        roleDeptLabel: "HR & Payroll",
        academicYearLabel: "2026–27",
        semesterParityLabel: "Odd Semester",
        showNotifications: false,
      }}
      navBadges={{
        hrPendingRequests: dashboard.data?.pending_requests_count || undefined,
        hrPendingAppraisals: dashboard.data?.pending_appraisals_count || undefined,
      }}
    >
      {children}
    </AppShell>
  );
}
