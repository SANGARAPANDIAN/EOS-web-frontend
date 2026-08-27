"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { AppShell } from "@/components/layout/AppShell";
import { academicCoordinatorModuleConfig } from "@/modules/academic-coordinator/nav";
import { useMyIdentity } from "@/modules/student/api/profile";
import { viewedAcademicYearLabel, currentInstitutionSemesterParity } from "@/lib/utils/date";
import { AcademicYearProvider } from "../context/AcademicYearContext";

const ALLOWED_ROLES = new Set(["academic_coordinator", "admin"]);

// Migrated off the bespoke AcademicCoordinatorSidebar + AcademicCoordinatorTopbar
// onto the shared AppShell/Sidebar/Topbar used by every other role module.
//
// - The logo, previously drawn inline in the topbar, now comes from the
//   shared Sidebar's own SidebarBrandHeader — nothing to wire up here.
// - The June-cutoff `currentSemesterLabel()` helper is replaced with the
//   shared `currentInstitutionSemesterParity` (same Odd/Even Semester
//   labels, same convention used by Secretary/SportsAdmin/EDC/Billing/COE),
//   paired with `viewedAcademicYearLabel` for the AY pill the same way those
//   modules do — this module has no real per-coordinator academic-calendar
//   endpoint (unlike HoD), so the institution-wide computed values are the
//   honest choice rather than fabricating a per-user one.
// - The inert "Settings — coming soon" button had no shared Topbar
//   equivalent and did nothing — dropped, same call already made for
//   Principal's inert icons.
// - The batch-cohort <Select> is NOT here — the shared Topbar has no slot
//   for a module-specific scoping control, so it now renders as
//   AcademicCoordinatorBatchBar from the page layout instead (still reading
//   the same AcademicYearContext, which still wraps this shell below).
// - The role gate (only academic_coordinator/admin may view this portal) is
//   real authorization logic, not chrome — kept exactly as it was.
export function AcademicCoordinatorShell({ children }: { children: React.ReactNode }) {
  const { session, status } = useAuth();
  const router = useRouter();
  const identity = useMyIdentity();

  const allowed = session != null && ALLOWED_ROLES.has(session.user.role);

  useEffect(() => {
    if (status === "loading") return; // not hydrated yet — do nothing
    if (session == null) {
      router.replace("/login");
      return;
    }
    if (!allowed) {
      router.replace("/");
    }
  }, [status, session, allowed, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen w-full items-center justify-center text-sm text-muted">
        Loading…
      </div>
    );
  }

  if (session == null || !allowed) {
    return null;
  }

  const now = new Date();

  return (
    <AcademicYearProvider>
      <AppShell
        moduleConfig={academicCoordinatorModuleConfig}
        header={{
          studentName: identity.data?.name,
          registerNumber: identity.data?.designation ?? "Academic Coordinator",
          searchPlaceholder: "Search courses, faculty, timetables...",
          academicYearLabel: viewedAcademicYearLabel(now.getFullYear(), now.getMonth()),
          semesterParityLabel: currentInstitutionSemesterParity(now),
          showNotifications: true,
        }}
      >
        {children}
      </AppShell>
    </AcademicYearProvider>
  );
}
