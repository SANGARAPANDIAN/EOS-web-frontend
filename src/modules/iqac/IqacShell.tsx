"use client";

import { AppShell } from "@/components/layout/AppShell";
import { iqacModuleConfig } from "@/modules/iqac/nav";
import { useMyIdentity } from "@/modules/iqac/api/identity";

export function IqacShell({ children }: { children: React.ReactNode }) {
  const identity = useMyIdentity();

  return (
    <AppShell
      moduleConfig={iqacModuleConfig}
      header={{
        studentName: identity.data?.name,
        registerNumber: "IQAC",
        roleDeptLabel: "IQAC Coordinator",
        academicYearLabel: "2026–27",
        semesterParityLabel: "Odd Semester",
      }}
    >
      {children}
    </AppShell>
  );
}
