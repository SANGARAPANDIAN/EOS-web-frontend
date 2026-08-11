import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import type { ModuleConfig, NavBadgeKey } from "@/modules/types";

export interface ShellHeaderData {
  studentName?: string;
  registerNumber?: string;
  programLabel?: string;
  academicYearLabel?: string;
  semesterParityLabel?: string;
  unreadNotifications?: number;
}

interface AppShellProps {
  moduleConfig: ModuleConfig;
  header?: ShellHeaderData;
  /** Real, live values for each NavItem.badgeKey — omit a key to render no badge for it. */
  navBadges?: Partial<Record<NavBadgeKey, ReactNode>>;
  children: ReactNode;
}

/**
 * Purely presentational app shell (sidebar + topbar + content well) shared
 * by every role module. Each module owns its own thin wrapper (e.g.
 * `modules/student/StudentShell.tsx`) that fetches role-specific identity
 * data and passes it in as `header` — this component never fetches data
 * itself, which is what keeps it reusable for future modules like faculty.
 */
export function AppShell({ moduleConfig, header, navBadges, children }: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-surface font-sans text-ink">
      <Sidebar
        moduleConfig={moduleConfig}
        studentName={header?.studentName}
        registerNumber={header?.registerNumber}
        navBadges={navBadges}
      />
      <main className="flex flex-1 flex-col overflow-y-auto">
        <Topbar
          programLabel={header?.programLabel}
          academicYearLabel={header?.academicYearLabel}
          semesterParityLabel={header?.semesterParityLabel}
          unreadNotifications={header?.unreadNotifications}
        />
        <div className="flex flex-1 flex-col gap-5 px-7 pt-[26px] pb-14">{children}</div>
      </main>
    </div>
  );
}
