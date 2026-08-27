"use client";

import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { financeModuleConfig } from "./nav";
import { useFinanceDashboard } from "./api/finance";
import { useFeeStudents, groupFeeStudents } from "./api/fees";

// Migrated onto the shared AppShell/Sidebar/Topbar (same shell every other
// role module now composes) — this used to be a fully custom inline-styled
// shell modeled on the Secretary portal, with its own hand-rolled
// notification bell/panel. The shared Topbar already does all of that
// internally (real backend, same @/modules/shared/api/notifications hooks)
// via `showNotifications`, so none of that is reimplemented here any more.
// The help/settings gear popover (static help text + extension number) has
// no shared equivalent and is dropped, same call already made for
// Principal's inert settings icon and Billing's help popover.

export function FinanceShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  // Real sidebar badge counts, from the same dashboard endpoint the Dashboard
  // page uses — never hardcoded figures.
  const { data: dash } = useFinanceDashboard();
  // Students still owing, from the same real fee endpoint the Fees pages read.
  const { data: feeRows } = useFeeStudents();
  const feeOutstanding = groupFeeStudents(feeRows ?? []).filter((s) => s.outstanding_amount > 0).length;

  // Real derived context for the header. July-June academic year, and the odd
  // semester is July-December — no hardcoded term string anywhere. The year
  // prefers the open fund's own academic_year when one exists, so the header
  // agrees with the money it is reporting.
  const now = new Date();
  const yearStart = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  const derivedYear = `${yearStart}–${String((yearStart + 1) % 100).padStart(2, "0")}`;
  const academicYearLabel = dash?.fund?.academic_year
    ? dash.fund.academic_year.replace("-", "–")
    : derivedYear;
  const semesterParityLabel = now.getMonth() >= 6 ? "Odd Semester" : "Even Semester";

  return (
    <AppShell
      moduleConfig={financeModuleConfig}
      programIcon="shield"
      header={{
        registerNumber: "Finance",
        searchPlaceholder: "Search proposals, orders, vendors...",
        programLabel: "Finance · Institution",
        academicYearLabel,
        semesterParityLabel,
        showNotifications: true,
      }}
      navBadges={{
        financePopPending: dash?.queues.pop_pending,
        financeSopPending: dash?.queues.sop_pending,
        financeAwaitingAllotment: dash?.delivery.pending_allotment,
        financeFeeOutstanding: feeOutstanding,
      }}
      quickCreate={{
        items: [
          { label: "Set / edit total amount", onSelect: () => router.push("/finance/overview") },
          { label: "Review POP approvals", onSelect: () => router.push("/finance/pop-approval") },
          { label: "Review SOP approvals", onSelect: () => router.push("/finance/sop-approval") },
          { label: "Track POP deliveries", onSelect: () => router.push("/finance/pop-tracking") },
          { label: "Fees overview", onSelect: () => router.push("/finance/fees") },
          { label: "Student fee records", onSelect: () => router.push("/finance/fees/students") },
          { label: "Post an announcement", onSelect: () => router.push("/finance/announcements") },
        ],
      }}
    >
      {children}
    </AppShell>
  );
}
