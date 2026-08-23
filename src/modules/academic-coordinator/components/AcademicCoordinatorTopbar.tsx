"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Icon } from "@/components/ui/Icon";
import { Select } from "@/components/ui/Select";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useAcademicYear } from "../context/AcademicYearContext";

interface AcademicCoordinatorTopbarProps {
  userEmail: string;
  onLogout: () => void;
}

/** June-cutoff semester label — same convention used across the ERP's other modules. Purely informational, not a real switchable setting. */
function currentSemesterLabel(): string {
  const month = new Date().getMonth() + 1;
  const isOdd = month >= 6 && month <= 11;
  return isOdd ? "Odd Semester" : "Even Semester";
}

export function AcademicCoordinatorTopbar({ userEmail, onLogout }: AcademicCoordinatorTopbarProps) {
  const semester = currentSemesterLabel();
  const { batchId, setBatchId, batches } = useAcademicYear();
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const roleMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!roleMenuOpen) return;
    function handleClick(e: MouseEvent) {
      if (roleMenuRef.current && !roleMenuRef.current.contains(e.target as Node)) setRoleMenuOpen(false);
    }
    window.addEventListener("mousedown", handleClick);
    return () => window.removeEventListener("mousedown", handleClick);
  }, [roleMenuOpen]);

  return (
    <header className="flex flex-wrap items-center gap-2.5 border-b border-border-default bg-surface px-[18px] py-[11px]">
      <div className="flex h-11 flex-none items-center gap-3">
        <Image
          src="/college-logo.png"
          alt="Sri Eshwar College of Engineering"
          width={38}
          height={38}
          className="shrink-0 object-contain"
        />
        <div className="flex h-full flex-col justify-center">
          <div className="text-[19px] leading-[1.1] font-bold tracking-[-.5px] text-ink">Sri Eshwar</div>
          <div className="mt-0.5 text-[11.5px] leading-[1.2] text-muted">College of Engineering</div>
        </div>
      </div>

      <div className="ml-4">
        <div className="text-[15px] font-semibold text-ink">Academic Coordinator Portal</div>
      </div>

      <div className="relative ml-auto flex-none" ref={roleMenuRef}>
        <button
          type="button"
          onClick={() => setRoleMenuOpen((o) => !o)}
          className="flex h-11 items-center gap-2 rounded-pill bg-accent-100 px-3.5"
        >
          <Icon name="verified_user" size={18} className="text-primary" />
          <span className="text-sm font-semibold text-primary">Academic Coordinator</span>
        </button>
        {roleMenuOpen && (
          <div className="absolute top-[calc(100%+6px)] right-0 w-44 overflow-hidden rounded-input border border-border-default bg-surface py-1 shadow-modal">
            <p className="truncate px-3.5 py-2 text-xs text-muted">{userEmail}</p>
            <button
              type="button"
              onClick={() => {
                setRoleMenuOpen(false);
                setConfirmingLogout(true);
              }}
              className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-sm font-medium text-ink hover:bg-surface-tint"
            >
              <Icon name="logout" size={16} /> Sign out
            </button>
          </div>
        )}
      </div>

      <Select
        value={batchId ?? ""}
        onChange={(e) => setBatchId(Number(e.target.value))}
        title="Batch — scopes every page to this cohort"
        className="h-11 min-w-0 w-auto flex-none rounded-card-sm font-semibold"
      >
        {batches.map((b) => (
          <option key={b.id} value={b.id}>
            {b.start_year}-{b.end_year}
          </option>
        ))}
      </Select>

      <span className="flex h-11 min-w-0 flex-none items-center rounded-card-sm bg-primary-dark px-4 text-sm font-semibold whitespace-nowrap text-white">
        {semester}
      </span>

      <button
        type="button"
        title="Settings — coming soon"
        className="flex size-11 flex-none items-center justify-center rounded-card-sm border border-border-default hover:bg-surface-tint"
      >
        <Icon name="settings" size={19} className="text-body" />
      </button>

      <ConfirmDialog
        open={confirmingLogout}
        title="Sign out?"
        description="You'll need to log in again to access the Academic Coordinator portal."
        confirmLabel="Sign out"
        destructive
        onConfirm={onLogout}
        onCancel={() => setConfirmingLogout(false)}
      />
    </header>
  );
}
