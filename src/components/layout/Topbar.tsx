"use client";

import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { SearchBar } from "@/components/ui/SearchBar";
import { cn } from "@/lib/utils/cn";

interface TopbarProps {
  searchPlaceholder?: string;
  programLabel?: string;
  /** A plain blue text pill with no icon — distinct from programLabel's icon+gray style (e.g. HoD's "HoD · Computer Science & Engineering"). */
  roleDeptLabel?: string;
  academicYearLabel?: string;
  semesterParityLabel?: string;
  unreadNotifications?: number;
  /** Defaults to shown — the HoD design reference has no notification bell in its topbar at all. */
  showNotifications?: boolean;
}

export function Topbar({
  searchPlaceholder = "Search courses, results, announcements...",
  programLabel,
  roleDeptLabel,
  academicYearLabel,
  semesterParityLabel,
  unreadNotifications = 0,
  showNotifications = true,
}: TopbarProps) {
  return (
    <header className="sticky top-0 z-20 flex h-20 shrink-0 items-center gap-4 border-b border-border-default bg-white px-7">
      <SearchBar placeholder={searchPlaceholder} />
      <div className="flex-1" />

      {programLabel && (
        <div className="flex items-center gap-2 rounded-pill border border-border-default px-3.5 py-2 text-[13px] font-semibold text-ink-soft">
          <Icon name="school" size={17} className="text-primary" />
          {programLabel}
        </div>
      )}

      {roleDeptLabel && (
        <div className="rounded-pill border border-border-accent px-3.5 py-2 text-[13px] font-bold text-primary">
          {roleDeptLabel}
        </div>
      )}

      {(academicYearLabel || semesterParityLabel) && (
        <div className="flex overflow-hidden rounded-pill border border-border-default text-[13px] font-semibold">
          {academicYearLabel && <span className="px-3.5 py-2 text-ink-soft">{academicYearLabel}</span>}
          {semesterParityLabel && (
            <span className="bg-primary-dark px-3.5 py-2 text-white">{semesterParityLabel}</span>
          )}
        </div>
      )}

      {showNotifications && (
        <div className="relative">
          <IconButton icon="notifications" aria-label="Notifications" />
          {unreadNotifications > 0 && (
            <span className={cn("absolute size-[7px] rounded-full bg-primary")} style={{ top: 6, right: 7 }} />
          )}
        </div>
      )}
    </header>
  );
}
