"use client";

import { AppShell } from "@/components/layout/AppShell";
import { canteenCashierModuleConfig } from "@/modules/canteen-cashier/nav";
import { useAuth } from "@/lib/auth/AuthContext";
import { viewedAcademicYearLabel, currentInstitutionSemesterParity } from "@/lib/utils/date";

/** No dedicated identity endpoint for this role — same reasoning as CanteenAdminShell (a shared operational account, not a person record). */
export function CanteenCashierShell({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();

  const now = new Date();
  const academicYearLabel = viewedAcademicYearLabel(now.getFullYear(), now.getMonth());
  const semesterParityLabel = currentInstitutionSemesterParity(now);

  return (
    <AppShell
      moduleConfig={canteenCashierModuleConfig}
      header={{
        studentName: session?.user.email,
        registerNumber: "Canteen Cashier",
        searchPlaceholder: "Search…",
        roleDeptLabel: "Canteen Cashier",
        academicYearLabel,
        semesterParityLabel,
        showNotifications: false,
      }}
    >
      {children}
    </AppShell>
  );
}
