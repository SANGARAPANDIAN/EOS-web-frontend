"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { principalColors } from "@/modules/principal/theme";
import { PrincipalUniversalSearch } from "@/modules/principal/components/PrincipalUniversalSearch";
import { useUnreadNotificationCount } from "@/modules/shared/api/notifications";
import { NotificationPanel } from "@/modules/advisor/NotificationPanel";

interface PrincipalTopbarProps {
  academicYearLabel?: string;
  semesterLabel?: string;
}

const QUICK_ACTIONS = [
  {
    key: "add-event",
    label: "Add event",
    sub: "Academic Calendar",
    icon: "event_available",
    href: "/principal/calendar?action=add-event",
  },
  {
    key: "new-announcement",
    label: "New announcement",
    sub: "Announcements",
    icon: "campaign",
    href: "/principal/announcements?action=new",
  },
] as const;

/**
 * Full-width header, matching the reference design (logo lives in the
 * header here, not the sidebar — unlike the Student module's shell). The
 * "+" button opens a quick-actions dropdown that navigates to the
 * Academic Calendar / Announcements pages with an `?action=` param those
 * pages read (useInitialQueryParam) to auto-open their own real,
 * already-backend-connected composers (useAddPersonalEntry / real
 * announcement create+publish) — no second, parallel create flow is
 * built here. The bell reuses the same real, already-built per-user
 * notifications inbox (GET /me/notifications/panel + unread-count) the
 * Secretary/Advisor shells already wire up — not a second notification
 * system. Faculty leave/OD requests now notify every active Principal at
 * creation time (faculty-leaves.service.ts / faculty-od.service.ts), so
 * those show up here for real. Settings is still inert — no real backend
 * behind it yet. The search box is real: click it or press Ctrl/Cmd+K to
 * open the universal search palette (students/faculty/departments/
 * approvals/announcements).
 */
export function PrincipalTopbar({ academicYearLabel, semesterLabel }: PrincipalTopbarProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const quickActionsRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { data: unreadCount } = useUnreadNotificationCount();

  useEffect(() => {
    if (!quickActionsOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (quickActionsRef.current && !quickActionsRef.current.contains(e.target as Node)) {
        setQuickActionsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [quickActionsOpen]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <header
      className="flex h-16 shrink-0 items-center gap-6 border-b px-5"
      style={{ background: principalColors.bg, borderColor: principalColors.border }}
    >
      <div className="flex w-[248px] shrink-0 items-center gap-2.5">
        <Image src="/college-logo.png" alt="College logo" width={38} height={38} className="h-[38px] w-auto object-contain" />
        <div className="min-w-0">
          <div
            className="text-[19px] font-extrabold leading-tight tracking-tight"
            style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.primaryDark }}
          >
            Sri Eshwar
          </div>
          <div className="whitespace-nowrap text-[11px] font-semibold leading-tight tracking-wide" style={{ color: principalColors.textMuted }}>
            College of Engineering
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setSearchOpen(true)}
        className="flex h-10 max-w-[460px] flex-1 items-center gap-2.5 rounded-[10px] border px-3 text-left"
        style={{ borderColor: principalColors.border }}
      >
        <Icon name="search" size={18} style={{ color: principalColors.textFaint }} />
        <span className="flex-1 truncate text-sm" style={{ color: principalColors.textFaint }}>
          Search students, faculty, departments, approvals…
        </span>
        <span
          className="rounded-md border px-1.5 py-0.5 text-[11px]"
          style={{
            fontFamily: "var(--font-jetbrains-mono)",
            color: principalColors.textFaint,
            background: principalColors.borderLight,
            borderColor: principalColors.border,
          }}
        >
          Ctrl K
        </span>
      </button>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <div
          className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1.5"
          style={{ background: principalColors.surfaceTint, borderColor: "#E0EBFB" }}
        >
          <Icon name="verified_user" size={18} style={{ color: "#16358A" }} />
          <span className="text-sm font-semibold" style={{ color: principalColors.primaryDark }}>
            Principal · Institution
          </span>
        </div>

        {academicYearLabel && (
          <div className="flex h-[38px] shrink-0 items-center overflow-hidden rounded-[10px] border" style={{ borderColor: principalColors.border }}>
            <span
              className="px-3 text-[13px] font-semibold"
              style={{ fontFamily: "var(--font-jetbrains-mono)", color: principalColors.textMuted }}
            >
              {academicYearLabel}
            </span>
            {semesterLabel && (
              <span className="px-3.5 text-[13px] font-semibold text-white" style={{ background: "#16358A" }}>
                {semesterLabel}
              </span>
            )}
          </div>
        )}

        <div ref={quickActionsRef} className="relative shrink-0">
          <button
            type="button"
            title="Quick actions"
            onClick={() => setQuickActionsOpen((v) => !v)}
            className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[10px] border"
            style={
              quickActionsOpen
                ? { borderColor: principalColors.primary, color: principalColors.primary, background: "#F1F6FE" }
                : { borderColor: principalColors.border, color: principalColors.textMuted }
            }
          >
            <Icon name="add" size={20} />
          </button>
          {quickActionsOpen && (
            <div
              className="absolute right-0 top-[46px] z-50 w-64 overflow-hidden rounded-[12px] border shadow-lg"
              style={{ background: principalColors.bg, borderColor: principalColors.border }}
            >
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.key}
                  type="button"
                  onClick={() => {
                    setQuickActionsOpen(false);
                    router.push(action.href);
                  }}
                  className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-[#F1F6FE]"
                >
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px]"
                    style={{ background: principalColors.surfaceTint, color: principalColors.primaryDark }}
                  >
                    <Icon name={action.icon} size={18} />
                  </span>
                  <span>
                    <div className="text-sm font-semibold" style={{ color: principalColors.heading }}>
                      {action.label}
                    </div>
                    <div className="text-xs" style={{ color: principalColors.textFaint }}>
                      {action.sub}
                    </div>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="relative shrink-0">
          <button
            type="button"
            title="Notifications"
            onClick={() => setNotifOpen((v) => !v)}
            className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[10px] border"
            style={
              notifOpen
                ? { borderColor: principalColors.primary, color: principalColors.primary, background: "#F1F6FE" }
                : { borderColor: principalColors.border, color: principalColors.textMuted }
            }
          >
            <Icon name="notifications" size={20} />
            {!!unreadCount?.count && unreadCount.count > 0 && (
              <span
                className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full"
                style={{ background: "#B42318" }}
              />
            )}
          </button>
          {notifOpen && (
            <div onClick={(e) => e.stopPropagation()}>
              <NotificationPanel onClose={() => setNotifOpen(false)} />
            </div>
          )}
        </div>
        <button
          type="button"
          title="Settings — coming soon"
          className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[10px] border"
          style={{ borderColor: principalColors.border, color: principalColors.textMuted }}
        >
          <Icon name="settings" size={20} />
        </button>
      </div>

      {searchOpen && <PrincipalUniversalSearch onClose={() => setSearchOpen(false)} />}
    </header>
  );
}
