"use client";

import { AppShell } from "@/components/layout/AppShell";
import { canteenAdminModuleConfig } from "@/modules/canteen-admin/nav";
import { useAuth } from "@/lib/auth/AuthContext";
import { viewedAcademicYearLabel, currentInstitutionSemesterParity } from "@/lib/utils/date";

// No dedicated identity endpoint exists for this role (unlike other shells'
// `/me/<role>/identity`) since canteen_admin has no personal profile fields
// (name, department, etc.) to fetch — it's a single shared operational
// account, not a person record. Uses the session's own email instead.
export function CanteenAdminShell({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();

  const now = new Date();
  const academicYearLabel = viewedAcademicYearLabel(now.getFullYear(), now.getMonth());
  const semesterParityLabel = currentInstitutionSemesterParity(now);

  return (
    <AppShell
      moduleConfig={canteenAdminModuleConfig}
      header={{
        studentName: session?.user.email,
        registerNumber: "Canteen Admin",
        // Omitting both `search` and `searchPlaceholder` falls through to
        // Topbar's shared HeaderSearch default, which calls a student-only
        // endpoint (/me/lms/subjects) regardless of role — a pre-existing
        // gap in that shared fallback, not something to fix here. Setting a
        // plain placeholder (same pattern as Billing/GateWarden) sidesteps
        // it until this module has its own real search to wire up.
        searchPlaceholder: "Search…",
        roleDeptLabel: "Canteen Admin",
        academicYearLabel,
        semesterParityLabel,
        showNotifications: false,
      }}
    >
      {children}
    </AppShell>
  );
}
