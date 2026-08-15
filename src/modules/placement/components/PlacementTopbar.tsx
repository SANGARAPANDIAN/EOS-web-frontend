"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { useCompanies } from "@/modules/placement/api/companies";
import { useDrives } from "@/modules/placement/api/drives";
import { useEligibleStudents } from "@/modules/placement/api/students";

interface PlacementTopbarProps {
  onOpenMobileNav: () => void;
}

interface ResultRow {
  key: string;
  kind: "Student" | "Company" | "Drive";
  title: string;
  meta: string;
  href: string;
}

/** Federated search across students, companies and drives — real data, not a nav-label filter, since the old app's version genuinely searched all three. */
export function PlacementTopbar({ onOpenMobileNav }: PlacementTopbarProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query.trim(), 250);
  const searchRef = useRef<HTMLDivElement>(null);

  const active = debouncedQuery.length >= 2;
  const students = useEligibleStudents();
  const drives = useDrives();
  const companies = useCompanies({ q: active ? debouncedQuery : undefined, page_size: 6 });

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setQuery("");
    }
    window.addEventListener("mousedown", handleClick);
    return () => window.removeEventListener("mousedown", handleClick);
  }, []);

  const results: ResultRow[] = useMemo(() => {
    if (!active) return [];
    const needle = debouncedQuery.toLowerCase();

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
        kind: "Student",
        title: s.name ?? s.studentIdNo,
        meta: [s.studentIdNo, s.departmentName].filter(Boolean).join(" · "),
        href: `/placement/students/${s.id}`,
      }));

    const companyRows: ResultRow[] = (companies.data?.data ?? []).slice(0, 6).map((c) => ({
      key: `company-${c.id}`,
      kind: "Company",
      title: c.name,
      meta: c.profileInfo || [c.industry, c.location].filter(Boolean).join(" · ") || "",
      href: "/placement/companies",
    }));

    const driveRows: ResultRow[] = (drives.data ?? [])
      .filter((d) => d.companyName.toLowerCase().includes(needle) || d.role?.toLowerCase().includes(needle))
      .slice(0, 4)
      .map((d) => ({
        key: `drive-${d.id}`,
        kind: "Drive",
        title: [d.companyName, d.role].filter(Boolean).join(" · "),
        meta: d.scheduledDate,
        href: `/placement/drives/${d.id}`,
      }));

    return [...studentRows, ...companyRows, ...driveRows];
  }, [active, debouncedQuery, students.data, companies.data, drives.data]);

  function goToResult(href: string) {
    router.push(href);
    setQuery("");
  }

  return (
    <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-admin-border bg-admin-canvas/92 px-7 py-3 backdrop-blur-[8px]">
      <button onClick={onOpenMobileNav} aria-label="Open menu" className="text-admin-body hover:text-admin-ink lg:hidden">
        <Icon name="menu" size={22} />
      </button>

      <div ref={searchRef} className="relative flex h-10 w-full max-w-[420px] items-center gap-2.5 rounded-admin-control border border-admin-border bg-admin-canvas px-3 has-[input:focus]:border-admin-primary">
        <Icon name="search" size={19} className="text-admin-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search students, companies, drives"
          className="min-w-0 flex-1 border-0 bg-transparent font-sans text-sm text-admin-ink outline-none placeholder:text-admin-muted"
        />

        {active && (
          <div className="absolute top-[calc(100%+6px)] left-0 right-0 z-30 max-h-80 overflow-auto rounded-admin-lg border border-admin-border bg-admin-canvas p-1.5 shadow-admin-dropdown">
            {results.length === 0 && (
              <p className="px-3 py-2.5 text-[12.5px] text-admin-muted">No results for &quot;{debouncedQuery}&quot;.</p>
            )}
            {results.map((r) => (
              <div
                key={r.key}
                onClick={() => goToResult(r.href)}
                className="flex cursor-pointer items-center gap-2.5 rounded-admin-sm px-3 py-2.5 hover:bg-admin-tint"
              >
                <span className="rounded-admin-xs bg-admin-tint-strong px-[7px] py-0.5 font-mono text-[9.5px] font-bold tracking-[.06em] text-admin-primary">
                  {r.kind.toUpperCase()}
                </span>
                <span className="text-[12.5px] font-semibold text-admin-ink">{r.title}</span>
                <span className="ml-auto truncate text-[11.5px] text-admin-muted">{r.meta}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1" />

      <button
        type="button"
        onClick={() => router.push("/placement/drives/new")}
        className="hidden items-center gap-1.5 rounded-admin-control bg-admin-primary px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-admin-primary-dark sm:flex"
      >
        <Icon name="add" size={17} />
        New drive
      </button>

      <div className="flex items-center gap-2 rounded-admin-pill border border-admin-border bg-admin-tint-strong px-3.5 py-2 text-[13px] font-semibold text-admin-primary-deep">
        <Icon name="business_center" size={17} />
        Placement Cell
      </div>
    </header>
  );
}
