"use client";

import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { billingModuleConfig } from "./nav";
import { useFeePaymentsDashboard, groupDashboardByStudent, useFinanceOverview } from "./api/fees";
import { viewedAcademicYearLabel, currentInstitutionSemesterParity } from "@/lib/utils/date";

// Migrated onto the shared AppShell/Sidebar/Topbar (same shell every other
// role module now composes) — this used to be a fully custom inline-styled
// shell with its own hand-rolled notification bell/panel; the shared Topbar
// already does all of that internally (real backend, same
// @/modules/shared/api/notifications hooks) via `showNotifications`, so
// none of that is reimplemented here any more.

export function BillingShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  // Real sidebar badge counts — was a hardcoded "1,240"/"8"/"3" before.
  const { data: dashboardRows } = useFeePaymentsDashboard();
  const studentCount = groupDashboardByStudent(dashboardRows ?? []).length;
  const { data: overview } = useFinanceOverview();
  const unsettledConcessions = overview?.operationalInsights.concessionSummary.unsettled_count ?? 0;
  const pendingDD = overview?.executiveKPIs.pendingEducationLoanDD ?? 0;

  // Real AY/semester chips, derived from today's date the same way every
  // other institution-wide (not single-student-scoped) module's topbar
  // does — replaces the old hardcoded "2026–27 / Odd Semester" pill.
  const now = new Date();
  const academicYearLabel = viewedAcademicYearLabel(now.getFullYear(), now.getMonth());
  const semesterParityLabel = currentInstitutionSemesterParity(now);

  return (
    <AppShell
      moduleConfig={billingModuleConfig}
      programIcon="shield"
      header={{
        searchPlaceholder: "Search students, receipts, structures...",
        programLabel: "Billing · Institution",
        academicYearLabel,
        semesterParityLabel,
        showNotifications: true,
      }}
      navBadges={{
        billingStudents: studentCount,
        billingConcessions: unsettledConcessions,
        billingDD: pendingDD,
      }}
      quickCreate={{
        items: [
          { label: "Receive a payment", onSelect: () => router.push("/billing/students") },
          { label: "Add fee structure", onSelect: () => router.push("/billing/structures") },
          { label: "Add quota", onSelect: () => router.push("/billing/quota") },
          { label: "Add education loan DD", onSelect: () => router.push("/billing/students") },
        ],
      }}
    >
      {children}
    </AppShell>
  );
}
