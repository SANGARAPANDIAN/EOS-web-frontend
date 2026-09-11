import { useMemo, type ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar, type TopbarSearchConfig, type TopbarQuickCreateConfig } from "@/components/layout/Topbar";
import type { ModuleConfig, NavBadgeKey, NavItem } from "@/modules/types";
import { cn } from "@/lib/utils/cn";
import { useUnreadMessagesCount } from "@/modules/messaging/api/conversations";

const MESSAGES_NAV_ITEM: NavItem = { key: "messages", label: "Messages", icon: "chat", href: "/messages", badgeKey: "messagesUnread" };

/**
 * Every role's sidebar gets the same "Messages" entry, spliced in right
 * after Dashboard in its first nav group — added here, in the one shared
 * shell every module already renders through, rather than in all 21
 * `nav.ts` files, so it can never drift or be missed when a new role module
 * is added later.
 */
function withMessagesNavItem(moduleConfig: ModuleConfig): ModuleConfig {
  const [firstGroup, ...restGroups] = moduleConfig.navGroups;
  if (!firstGroup) return moduleConfig;
  return {
    ...moduleConfig,
    navGroups: [
      { ...firstGroup, items: [firstGroup.items[0], MESSAGES_NAV_ITEM, ...firstGroup.items.slice(1)].filter((item): item is NavItem => Boolean(item)) },
      ...restGroups,
    ],
  };
}

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
  /** Route to a real per-module settings page — omit to hide the topbar's gear icon entirely. Only set this for a module with genuine configurable state. */
  settingsHref?: string;
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
  /** Opt-in: makes the sidebar footer's avatar/name area clickable — see `SidebarUserFooter`. */
  onIdentityClick?: () => void;
  children: ReactNode;
}

/**
 * Purely presentational app shell (sidebar + topbar + content well) shared
 * by every role module. Each module owns its own thin wrapper (e.g.
 * `modules/student/StudentShell.tsx`) that fetches role-specific identity
 * data and passes it in as `header` — this component itself doesn't fetch
 * per-role data. One deliberate exception: the "Messages" nav item's unread
 * count (below) is fetched here directly, the same way the topbar's own
 * notification-bell count already is, so every module gets a live badge
 * without having to wire it itself.
 */
export function AppShell({ moduleConfig, header, navBadges, search, programIcon, quickCreate, customTopbar, onIdentityClick, children }: AppShellProps) {
  const unreadMessages = useUnreadMessagesCount();
  const configWithMessages = useMemo(() => withMessagesNavItem(moduleConfig), [moduleConfig]);
  const badgesWithMessages = useMemo<Partial<Record<NavBadgeKey, ReactNode>>>(
    () => ({ ...navBadges, messagesUnread: unreadMessages.data?.count || undefined }),
    [navBadges, unreadMessages.data?.count],
  );

  return (
    // data-shell-root/data-shell-main/data-no-print: this shell uses a
    // fixed-viewport (h-screen + overflow-hidden/overflow-y-auto) layout so
    // only <main> scrolls on screen — which is exactly what produces a
    // print-blank page, since a fixed-height, overflow-clipped ancestor
    // doesn't let the print engine paginate content beyond the current
    // viewport. globals.css resets these back to natural document flow
    // under @media print (and hides the chrome) without touching on-screen
    // behavior at all. Every module renders through this one shell, so
    // fixing it here fixes print for all of them at once.
    <div data-shell-root="" className="flex h-screen overflow-hidden bg-surface font-sans text-ink">
      <div data-no-print="" style={{ display: "contents" }}>
        <Sidebar
          moduleConfig={configWithMessages}
          studentName={header?.studentName}
          registerNumber={header?.registerNumber}
          navBadges={badgesWithMessages}
          onIdentityClick={onIdentityClick}
        />
      </div>
      <main data-shell-main="" className="flex flex-1 flex-col overflow-y-auto">
        <div data-no-print="" style={{ display: "contents" }}>
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
              settingsHref={header?.settingsHref}
            />
          )}
        </div>
        <div className={cn("flex min-h-0 flex-1 flex-col gap-5 px-7 pb-14", customTopbar ? "pt-5" : "pt-9")}>{children}</div>
      </main>
    </div>
  );
}
