"use client";

import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { SearchBar } from "@/components/ui/SearchBar";
import { cn } from "@/lib/utils/cn";

interface TopbarProps {
  programLabel?: string;
  academicYearLabel?: string;
  semesterParityLabel?: string;
  unreadNotifications?: number;
}

export function Topbar({
  programLabel,
  academicYearLabel,
  semesterParityLabel,
  unreadNotifications = 0,
}: TopbarProps) {
  return (
    <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-border-default bg-white/92 px-7 py-3 backdrop-blur-[8px]">
      <SearchBar placeholder="Search courses, results, announcements..." />
      <div className="flex-1" />

      {programLabel && (
        <div className="flex items-center gap-2 rounded-pill border border-border-default px-3.5 py-2 text-[13px] font-semibold text-ink-soft">
          <Icon name="school" size={17} className="text-primary" />
          {programLabel}
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

      <div className="relative">
        <IconButton icon="notifications" aria-label="Notifications" />
        {unreadNotifications > 0 && (
          <span className={cn("absolute size-[7px] rounded-full bg-primary")} style={{ top: 6, right: 7 }} />
        )}
      </div>
    </header>
  );
}
