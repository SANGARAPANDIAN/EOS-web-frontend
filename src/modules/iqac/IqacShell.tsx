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
        // Omitting both `search` and `searchPlaceholder` falls through to
        // Topbar's shared HeaderSearch default, which calls a student-only
        // endpoint (/me/lms/subjects) regardless of role — a pre-existing
        // gap in that shared fallback (see CanteenAdminShell.tsx). Setting a
        // plain placeholder sidesteps it until this module has its own real
        // search to wire up.
        searchPlaceholder: "Search…",
        roleDeptLabel: "IQAC Coordinator",
        academicYearLabel: "2026–27",
        semesterParityLabel: "Odd Semester",
      }}
    >
      {children}
    </AppShell>
  );
}
