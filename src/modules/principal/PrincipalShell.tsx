"use client";

import { PrincipalSidebar } from "@/modules/principal/components/PrincipalSidebar";
import { PrincipalTopbar } from "@/modules/principal/components/PrincipalTopbar";
import { useMyIdentity } from "@/modules/principal/api/profile";
import { usePrincipalDashboardSummary } from "@/modules/principal/api/dashboard";

export function PrincipalShell({ children }: { children: React.ReactNode }) {
  const identity = useMyIdentity();
  const summary = usePrincipalDashboardSummary();

  return (
    // data-shell-root/data-shell-main: this shell uses a fixed-viewport
    // (h-screen + overflow-hidden) layout so only <main> scrolls. That's
    // exactly what breaks printing (a print-blank page) — a fixed-height,
    // overflow-clipped ancestor doesn't let the print engine paginate
    // content beyond the current viewport. globals.css resets both back to
    // natural document flow under @media print, without touching on-screen
    // behavior at all.
    <div data-shell-root="" className="flex h-screen flex-col overflow-hidden" style={{ fontFamily: "var(--font-public-sans)" }}>
      {/* Academic-year/semester chip omitted: no academic-calendar data is
          wired into the Principal module yet, and the mockup's "2026–27 /
          Odd Semester" values are not real — leaving this off is more
          honest than showing an unbacked chip. */}
      <div data-no-print="" style={{ display: "contents" }}>
        <PrincipalTopbar />
      </div>
      <div className="flex min-h-0 flex-1">
        <div data-no-print="" style={{ display: "contents" }}>
          <PrincipalSidebar
            displayName={identity.data?.name}
            designation={identity.data?.designation}
            navBadges={{
              principalStudentsTotal: summary.data?.students.total_active,
              principalFacultyTotal: summary.data?.faculty.total_active,
            }}
          />
        </div>
        <main data-shell-main="" className="flex flex-1 flex-col overflow-y-auto bg-white px-8 pb-14 pt-7">
          <div className="mx-auto flex w-full max-w-[1420px] flex-1 flex-col gap-5">{children}</div>
        </main>
      </div>
    </div>
  );
}
