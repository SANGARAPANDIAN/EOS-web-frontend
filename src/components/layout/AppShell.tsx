import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar, type TopbarSearchConfig, type TopbarQuickCreateConfig } from "@/components/layout/Topbar";
import type { ModuleConfig, NavBadgeKey } from "@/modules/types";
import { cn } from "@/lib/utils/cn";

export interface ShellHeaderData {
  studentName?: string;
  registerNumber?: string;
  searchPlaceholder?: string;
  programLabel?: string;
  roleDeptLabel?: string;
  academicYearLabel?: string;
  semesterParityLabel?: string;
  unreadNotifications?: number;
  showNotifications?: boolean;
}

interface AppShellProps {
  moduleConfig: ModuleConfig;
  header?: ShellHeaderData;
  /** Real, live values for each NavItem.badgeKey — omit a key to render no badge for it. */
  navBadges?: Partial<Record<NavBadgeKey, ReactNode>>;
  /** Omit for modules that don't have a live search source yet — falls back to the static placeholder bar. */
  search?: TopbarSearchConfig;
  /** Icon for the header.programLabel pill — defaults to Topbar's own default ("school") when omitted. */
  programIcon?: string;
  /** Omit to hide the topbar's "+" quick-create button entirely. */
  quickCreate?: TopbarQuickCreateConfig;
  /**
   * Replaces the shared Topbar with a module-specific one — rendered in the
   * exact same full-width slot (flush with the sidebar's border), not inset
   * inside the content padding like `children` is. Use this instead of
   * nesting a custom header inside `children`, which would leave its border
   * inset by the content's own `px-7` and out of alignment with the
   * sidebar — e.g. COE's search/AY chips row replaces Topbar entirely.
   */
  customTopbar?: ReactNode;
  children: ReactNode;
}

/**
 * Purely presentational app shell (sidebar + topbar + content well) shared
 * by every role module. Each module owns its own thin wrapper (e.g.
 * `modules/student/StudentShell.tsx`) that fetches role-specific identity
 * data and passes it in as `header` — this component never fetches data
 * itself, which is what keeps it reusable for future modules like faculty.
 */
export function AppShell({ moduleConfig, header, navBadges, search, programIcon, quickCreate, customTopbar, children }: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-surface font-sans text-ink">
      <Sidebar
        moduleConfig={moduleConfig}
        studentName={header?.studentName}
        registerNumber={header?.registerNumber}
        navBadges={navBadges}
      />
      <main className="flex flex-1 flex-col overflow-y-auto">
        {customTopbar ?? (
          <Topbar
            moduleConfig={moduleConfig}
            searchPlaceholder={header?.searchPlaceholder}
            programLabel={header?.programLabel}
            programIcon={programIcon}
            roleDeptLabel={header?.roleDeptLabel}
            academicYearLabel={header?.academicYearLabel}
            semesterParityLabel={header?.semesterParityLabel}
            unreadNotifications={header?.unreadNotifications}
            showNotifications={header?.showNotifications}
            search={search}
            quickCreate={quickCreate}
          />
        )}
        <div className={cn("flex flex-1 flex-col gap-5 px-7 pb-14", customTopbar ? "pt-5" : "pt-9")}>{children}</div>
      </main>
    </div>
  );
}
