"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Icon } from "@/components/ui/Icon";
import { principalColors } from "@/modules/principal/theme";
import { PrincipalUniversalSearch } from "@/modules/principal/components/PrincipalUniversalSearch";

interface PrincipalTopbarProps {
  academicYearLabel?: string;
  semesterLabel?: string;
}

/**
 * Full-width header, matching the reference design (logo lives in the
 * header here, not the sidebar — unlike the Student module's shell). The
 * "+" composer, bell and settings icons are rendered for visual fidelity to
 * the reference but are inert (no onClick) — none of them have a real
 * backend behind them yet, so they don't pretend to do anything. The search
 * box is real: click it or press Ctrl/Cmd+K to open the universal search
 * palette (students/faculty/departments/approvals/announcements).
 */
export function PrincipalTopbar({ academicYearLabel, semesterLabel }: PrincipalTopbarProps) {
  const [searchOpen, setSearchOpen] = useState(false);

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

        <button
          type="button"
          title="New announcement — coming soon"
          className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[10px] border"
          style={{ borderColor: principalColors.border, color: principalColors.textMuted }}
        >
          <Icon name="add" size={20} />
        </button>
        <button
          type="button"
          title="Notifications — coming soon"
          className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[10px] border"
          style={{ borderColor: principalColors.border, color: principalColors.textMuted }}
        >
          <Icon name="notifications" size={20} />
        </button>
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
