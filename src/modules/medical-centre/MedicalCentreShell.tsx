"use client";

import { AppShell } from "@/components/layout/AppShell";
import { medicalCentreModuleConfig } from "@/modules/medical-centre/nav";
import { MEDICAL_CENTRE_MOCK_SUMMARY } from "@/modules/medical-centre/summary";

// Design-only pass: nav badge counts are static mock values standing in for
// live OPD/sick-room/pharmacy counts that will replace them once this module
// is wired to the backend. Sidebar identity comes from the real logged-in
// session (Sidebar/SidebarUserFooter falls back to session email when
// studentName is omitted) — no fake medical-officer name here.

export function MedicalCentreShell({ children }: { children: React.ReactNode }) {
  const { opdWaiting, bedsOccupied, lowStockCount } = MEDICAL_CENTRE_MOCK_SUMMARY;

  return (
    <AppShell
      moduleConfig={medicalCentreModuleConfig}
      header={{
        registerNumber: "Medical Centre",
        programLabel: "Medical officer",
        academicYearLabel: "2026–27",
        semesterParityLabel: "Odd Semester",
      }}
      navBadges={{
        mcOpdWaiting: opdWaiting,
        mcBedsOccupied: bedsOccupied,
        mcLowStock: lowStockCount,
      }}
    >
      {children}
    </AppShell>
  );
}
