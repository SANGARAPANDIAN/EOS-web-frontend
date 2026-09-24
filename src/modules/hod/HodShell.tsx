"use client";

import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { hodModuleConfig } from "@/modules/hod/nav";
import { useMyIdentity } from "@/modules/student/api/profile";
import { useHodAcademicCalendar } from "@/modules/hod/api/profile";
import { useHodDashboard } from "@/modules/hod/api/dashboard";
import { academicYearLabel, currentInstitutionSemesterParity, viewedAcademicYearLabel } from "@/lib/utils/date";
import { useHandledClasses } from "@/modules/advisor/api/classes";
import { useIsClassAdvisor } from "@/modules/advisor/api/profile";

export function HodShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const identity = useMyIdentity();
  const calendar = useHodAcademicCalendar();
  // The dashboard summary is fetched here too (not just on the Dashboard
  // page) because it's the only real source for 3 of the sidebar's live
  // badge counts (faculty on roll, pending leave/OD) — React Query caches
  // it, so navigating into the Dashboard page itself doesn't refetch.
  const dashboard = useHodDashboard();

  const semester = calendar.data?.semester ?? undefined;

  // A HoD may ALSO personally teach a subject or advise a class, exactly
  // like any other faculty member — the same two real endpoints
  // (already @Roles(FACULTY, HOD)) the real Faculty/Advisor portal itself
  // uses to gate its own "MY CLASS" nav group. If either is non-empty,
  // this HoD has a real reason to switch into that full portal instead of
  // the old bespoke "My Class" section this sidebar used to carry.
  const handledClasses = useHandledClasses();
  const { isAdvisor } = useIsClassAdvisor();
  const hasSwitchTarget = (handledClasses.data?.length ?? 0) > 0 || isAdvisor;

  return (
    <AppShell
      moduleConfig={hodModuleConfig}
      switchView={
        hasSwitchTarget
          ? { label: "Switch to Faculty view", icon: "swap_horiz", onClick: () => router.push("/faculty/dashboard") }
          : undefined
      }
      header={{
        studentName: identity.data?.name,
        registerNumber: dashboard.data ? `HoD · ${dashboard.data.department.code}` : undefined,
        searchPlaceholder: "Search students, subjects, approvals...",
        // Always a real string from first paint (never undefined while
        // loading) so the pill's slot in the topbar is never absent —
        // conditionally rendering it based on async data made the header's
        // content (and apparent height) shift between page loads depending
        // on fetch timing, which is what read as "inconsistent alignment".
        roleDeptLabel: `HoD · ${identity.data?.department ?? "—"}`,
        // Falls back to the plain calendar-date convention (same one the
        // institution-wide topbars use) whenever this HoD has no personal
        // teaching assignment to derive a real batch-scoped semester from —
        // a HoD is still operating within a real academic year/semester for
        // their whole department even when they don't personally teach,
        // so this must never be a permanent "—" (see the bug this fixed:
        // every HoD in the seed data has zero personal teaching load, which
        // left the pill blank for the entire role, not just an edge case).
        academicYearLabel:
          academicYearLabel(calendar.data?.start_date ?? null, semester) ??
          viewedAcademicYearLabel(new Date().getFullYear(), new Date().getMonth()),
        semesterParityLabel:
          semester !== undefined
            ? semester % 2 === 1
              ? "Odd Semester"
              : "Even Semester"
            : currentInstitutionSemesterParity(),
        showNotifications: false,
      }}
      navBadges={{
        facultyCount: dashboard.data?.my_department.faculty_count,
        leaveRequestsPending: dashboard.data?.needs_attention.pending_leaves_count || undefined,
        odRequestsPending: dashboard.data?.needs_attention.pending_ods_count || undefined,
      }}
    >
      {children}
    </AppShell>
  );
}
