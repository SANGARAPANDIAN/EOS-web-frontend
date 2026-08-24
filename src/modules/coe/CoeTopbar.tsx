"use client";

import { usePathname } from "next/navigation";
import { SearchBar, IconButton } from "@/components/ui";
import { coeModuleConfig } from "@/modules/coe/nav";
import { viewedAcademicYearLabel, currentInstitutionSemesterParity } from "@/lib/utils/date";

function currentPageLabel(pathname: string): string {
  // Mark Entry Sheet lives at /coe/exam-valuation/mark-entry-sheet/[id] (no
  // nav item of its own — every bundle is reached from Exam Valuation's
  // "Open"/"Verify" links), so this prefix match resolves it to "Exam
  // Valuation" for free instead of falling through to the default below.
  for (const group of coeModuleConfig.navGroups) {
    for (const item of group.items) {
      if (pathname.startsWith(item.href)) return item.label;
    }
  }
  return "Dashboard";
}

/**
 * The new COE Module design puts a persistent strip above every page's own
 * header band — breadcrumb, search, and real AY/semester chips (derived from
 * today's date the same way the rest of the app already does institution-
 * wide parity, not tied to any one student) — instead of the old design's
 * per-page inline search+bell. Rendered once by CoeShell so every page gets
 * it without repeating markup.
 */
export function CoeTopbar() {
  const pathname = usePathname();
  const label = currentPageLabel(pathname);
  const now = new Date();
  const academicYear = viewedAcademicYearLabel(now.getFullYear(), now.getMonth());
  const semester = currentInstitutionSemesterParity(now);

  return (
    <div className="sticky top-0 z-20 flex h-20 shrink-0 items-center justify-between gap-6 border-b border-[#eef1f7] bg-white px-7">
      <div className="flex shrink-0 items-center gap-2 text-[13px]">
        <span className="text-muted">COE</span>
        <span className="text-subtle">/</span>
        <span className="font-bold text-ink">{label}</span>
      </div>
      <SearchBar placeholder="Search exams, students, halls, courses…" className="max-w-[420px] flex-1" />
      <div className="flex shrink-0 items-center gap-2.5">
        <span className="rounded-input border border-border-default bg-surface px-3 py-2 text-[12.5px] font-bold text-ink">AY {academicYear}</span>
        <span className="rounded-input bg-primary px-3 py-2 text-[12.5px] font-bold text-white">{semester}</span>
        <IconButton icon="notifications" aria-label="Notifications" />
      </div>
    </div>
  );
}
