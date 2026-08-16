"use client";

import { AppShell } from "@/components/layout/AppShell";
import { hostelWardenModuleConfig } from "@/modules/hostel-warden/nav";
import { useMyIdentity } from "@/modules/hostel-warden/api/identity";
import { useHostelDashboardSummary } from "@/modules/hostel-warden/api/dashboard";

const WING_LABEL: Record<string, string> = { boys: "Boys hostel", girls: "Girls hostel" };

export function HostelWardenShell({ children }: { children: React.ReactNode }) {
  const identity = useMyIdentity();
  const summary = useHostelDashboardSummary();
  const hostel = summary.data?.hostel;

  return (
    <AppShell
      moduleConfig={hostelWardenModuleConfig}
      header={{
        studentName: identity.data?.name,
        registerNumber: hostel ? hostel.name : "Hostel warden",
        programLabel: hostel ? `Warden · ${WING_LABEL[hostel.wing] ?? hostel.name}` : "Warden",
        academicYearLabel: "2026–27",
        semesterParityLabel: "Odd Semester",
      }}
      navBadges={{
        hwPendingPasses: summary.data && summary.data.pending_approvals > 0 ? summary.data.pending_approvals : undefined,
        hwOpenComplaints: summary.data && summary.data.complaints_open > 0 ? summary.data.complaints_open : undefined,
      }}
    >
      {children}
    </AppShell>
  );
}
