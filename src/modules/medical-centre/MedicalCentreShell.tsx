"use client";

import { AppShell } from "@/components/layout/AppShell";
import { medicalCentreModuleConfig } from "@/modules/medical-centre/nav";
import { MEDICAL_CENTRE_MOCK_SUMMARY } from "@/modules/medical-centre/summary";

// Design-only pass: header identity and nav badge counts are static mock
// values standing in for the real medical-officer profile + live OPD/sick-
// room/pharmacy counts that will replace them once this module is wired to
// the backend.

export function MedicalCentreShell({ children }: { children: React.ReactNode }) {
  const { opdWaiting, bedsOccupied, lowStockCount } = MEDICAL_CENTRE_MOCK_SUMMARY;

  return (
    <AppShell
      moduleConfig={medicalCentreModuleConfig}
      header={{
        studentName: "Dr. S. Meenambal",
        registerNumber: "Medical Centre",
        programLabel: "Medical officer",
        academicYearLabel: "2026–27",
        semesterParityLabel: "Odd Semester",
        unreadNotifications: 1,
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
