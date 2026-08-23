"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useCompanies } from "../hooks/useCompanies";
import { useDrives } from "../hooks/useDrives";
import { useEligibleStudents } from "../hooks/useEligibleStudents";

interface PlacementTopbarProps {
  userEmail: string;
  role: string;
  onLogout: () => void;
}

/** June-cutoff academic year/semester — same convention used across the ERP's other modules. Purely computed, not a real switchable setting. */
function currentAcademicCycle(): { year: string; semester: string } {
  const now = new Date();
  const month = now.getMonth() + 1;
  const startYear = month >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  const isOdd = month >= 6 && month <= 11;
  return { year: `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`, semester: isOdd ? "Odd Semester" : "Even Semester" };
}

function roleLabel(role: string): string {
  if (role === "placement") return "Placement Officer";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

interface ResultRow {
  key: string;
  kind: "STUDENT" | "COMPANY" | "DRIVE";
  title: string;
  meta: string;
  href: string;
}

export function PlacementTopbar({ userEmail, role, onLogout }: PlacementTopbarProps) {
  const router = useRouter();
  const { year, semester } = currentAcademicCycle();
  const [gq, setGq] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const roleMenuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(gq.trim()), 250);
    return () => clearTimeout(timer);
  }, [gq]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    if (!roleMenuOpen) return;
    function handleClick(e: MouseEvent) {
      if (roleMenuRef.current && !roleMenuRef.current.contains(e.target as Node)) setRoleMenuOpen(false);
    }
    window.addEventListener("mousedown", handleClick);
    return () => window.removeEventListener("mousedown", handleClick);
  }, [roleMenuOpen]);

  // Clears both the raw and debounced query in the same tick — clearing only
  // `gq` left the input visibly empty while the dropdown (gated on
  // `debouncedQ`) kept showing the stale results for another 250ms, which
  // read as the results panel flickering open/closed on its own.
  function closeSearch() {
    setGq("");
    setDebouncedQ("");
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) closeSearch();
    }
    window.addEventListener("mousedown", handleClick);
    return () => window.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeSearch();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const students = useEligibleStudents();
  const drives = useDrives();
  const companies = useCompanies({ q: debouncedQ.length >= 2 ? debouncedQ : undefined, page_size: 6 });

  const results: ResultRow[] = useMemo(() => {
    if (debouncedQ.length < 2) return [];
    const needle = debouncedQ.toLowerCase();

    const studentRows: ResultRow[] = (students.data ?? [])
      .filter(
        (s) =>
          s.name?.toLowerCase().includes(needle) ||
          s.studentIdNo.toLowerCase().includes(needle) ||
          s.rollNo?.toLowerCase().includes(needle),
      )
      .slice(0, 6)
      .map((s) => ({
        key: `student-${s.id}`,
        kind: "STUDENT" as const,
        title: s.name ?? s.studentIdNo,
        meta: [s.studentIdNo, s.departmentName].filter(Boolean).join(" · "),
        href: `/placement/students/${s.id}`,
      }));

    const companyRows: ResultRow[] = (companies.data?.data ?? []).slice(0, 6).map((c) => ({
      key: `company-${c.id}`,
      kind: "COMPANY" as const,
      title: c.name,
      meta: c.profileInfo || [c.industry, c.location].filter(Boolean).join(" · ") || "",
      href: "/placement/companies",
    }));

    const driveRows: ResultRow[] = (drives.data ?? [])
      .filter((d) => d.companyName.toLowerCase().includes(needle) || d.role?.toLowerCase().includes(needle))
      .slice(0, 4)
      .map((d) => ({
        key: `drive-${d.id}`,
        kind: "DRIVE" as const,
        title: [d.companyName, d.role].filter(Boolean).join(" · "),
        meta: d.scheduledDate,
        href: `/placement/drives/${d.id}`,
      }));

    return [...studentRows, ...companyRows, ...driveRows];
  }, [debouncedQ, students.data, companies.data, drives.data]);

  function goToResult(href: string) {
    router.push(href);
    closeSearch();
  }

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

      <div ref={searchRef} className="relative ml-16 w-full max-w-[380px] shrink-0">
        <Icon name="search" size={18} className="pointer-events-none absolute top-[13px] left-[15px] text-subtle" />
        <input
          ref={searchInputRef}
          value={gq}
          onChange={(e) => setGq(e.target.value)}
          placeholder="Search students, companies, drives"
          className="h-11 w-full min-w-0 rounded-card-sm border border-border-default bg-surface-tint py-[11px] pr-[78px] pl-11 font-sans text-[13.5px] text-ink placeholder:text-subtle focus:border-border-accent focus:bg-surface focus:outline-none"
        />
        <span className="absolute top-[11px] right-3 rounded-input bg-surface-tint px-2 py-1 font-mono text-[11px] text-subtle">
          Ctrl K
        </span>

        {debouncedQ.length >= 2 && (
          <div className="absolute top-[50px] right-0 left-0 z-[70] max-h-80 overflow-auto rounded-input border border-border-default bg-surface p-[5px] shadow-modal">
            {results.length === 0 && <p className="px-[11px] py-[9px] text-[12.5px] text-subtle">No results for &quot;{debouncedQ}&quot;.</p>}
            {results.map((r) => (
              <div
                key={r.key}
                onClick={() => goToResult(r.href)}
                className="flex cursor-pointer items-center gap-2.5 rounded-[7px] px-[11px] py-[9px] hover:bg-surface-tint"
              >
                <span className="rounded-[4px] bg-accent-100 px-1.5 py-[3px] font-mono text-[9.5px] font-medium tracking-[.6px] text-primary">
                  {r.kind}
                </span>
                <span className="text-[12.5px] font-semibold">{r.title}</span>
                <span className="ml-auto truncate text-[11.5px] text-subtle">{r.meta}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="relative ml-auto flex-none" ref={roleMenuRef}>
        <button
          type="button"
          onClick={() => setRoleMenuOpen((o) => !o)}
          className="flex h-11 items-center gap-2 rounded-pill bg-accent-100 px-3.5"
        >
          <Icon name="verified_user" size={18} className="text-primary" />
          <span className="text-sm font-semibold text-primary">{roleLabel(role)}</span>
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

      <select
        value={year}
        onChange={() => {}}
        className="h-11 min-w-0 flex-none rounded-card-sm border border-border-default bg-surface px-3 text-sm font-semibold text-ink"
      >
        <option>{year}</option>
      </select>

      <span className="flex h-11 min-w-0 flex-none items-center rounded-card-sm bg-primary-dark px-4 text-sm font-semibold whitespace-nowrap text-white">
        {semester}
      </span>

      <button
        type="button"
        title="Create drive"
        onClick={() => router.push("/placement/drives/new")}
        className="flex size-11 flex-none items-center justify-center rounded-card-sm border border-border-default text-xl text-ink hover:bg-surface-tint"
      >
        +
      </button>

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
        description="You'll need to log in again to access the Placement Cell portal."
        confirmLabel="Sign out"
        destructive
        onConfirm={onLogout}
        onCancel={() => setConfirmingLogout(false)}
      />
    </header>
  );
}
