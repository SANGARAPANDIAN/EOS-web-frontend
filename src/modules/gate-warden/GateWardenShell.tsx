"use client";

import { AppShell } from "@/components/layout/AppShell";
import { gateWardenModuleConfig } from "@/modules/gate-warden/nav";
import { useMyIdentity } from "@/modules/gate-warden/api/identity";

export function GateWardenShell({ children }: { children: React.ReactNode }) {
  const identity = useMyIdentity();

  return (
    <AppShell
      moduleConfig={gateWardenModuleConfig}
      header={{
        studentName: identity.data?.name,
        registerNumber: "Gate warden",
        roleDeptLabel: "Gate warden",
        academicYearLabel: "2026–27",
        semesterParityLabel: "Odd Semester",
        showNotifications: false,
      }}
    >
      {children}
    </AppShell>
  );
}
