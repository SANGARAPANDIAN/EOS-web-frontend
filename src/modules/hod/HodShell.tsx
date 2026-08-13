"use client";

import { AppShell } from "@/components/layout/AppShell";
import { hodModuleConfig } from "@/modules/hod/nav";
import { useMyIdentity } from "@/modules/student/api/profile";
import { useHodAcademicCalendar } from "@/modules/hod/api/profile";
import { useHodDashboard } from "@/modules/hod/api/dashboard";
import { academicYearLabel } from "@/lib/utils/date";

export function HodShell({ children }: { children: React.ReactNode }) {
  const identity = useMyIdentity();
  const calendar = useHodAcademicCalendar();
  // The dashboard summary is fetched here too (not just on the Dashboard
  // page) because it's the only real source for 3 of the sidebar's live
  // badge counts (faculty on roll, pending leave/OD) — React Query caches
  // it, so navigating into the Dashboard page itself doesn't refetch.
  const dashboard = useHodDashboard();

  const semester = calendar.data?.semester ?? undefined;

  return (
    <AppShell
      moduleConfig={hodModuleConfig}
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
        academicYearLabel: academicYearLabel(calendar.data?.start_date ?? null, semester) ?? "—",
        semesterParityLabel:
          semester !== undefined ? (semester % 2 === 1 ? "Odd Semester" : "Even Semester") : "—",
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
