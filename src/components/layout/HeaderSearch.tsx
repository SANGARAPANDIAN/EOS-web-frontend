"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SearchBar } from "@/components/ui/SearchBar";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils/cn";
import type { ModuleConfig } from "@/modules/types";
import { useMyLmsSubjects } from "@/modules/student/api/lms";
import { useAnnouncements } from "@/modules/shared/api/announcements";

interface ResultRow {
  key: string;
  href: string;
  icon: string;
  title: string;
  meta?: string;
}

interface ResultGroup {
  label: string;
  rows: ResultRow[];
}

const MAX_PER_GROUP = 5;

function matches(query: string, ...fields: (string | null | undefined)[]): boolean {
  const q = query.toLowerCase();
  return fields.some((f) => f?.toLowerCase().includes(q));
}

/**
 * Header search — the box itself (SearchBar) is shared/presentational, but
 * the search *behaviour* here is student-specific for now (useMyLmsSubjects/
 * useAnnouncements are role-scoped student endpoints): if a second role
 * module is ever registered (see modules/registry.ts), the Courses/
 * Announcements groups below would need to become per-role, same as
 * moduleConfig already is. The Pages group is already fully role-agnostic
 * (driven entirely by moduleConfig.navGroups), so it needs no changes.
 */
export function HeaderSearch({ moduleConfig }: { moduleConfig: ModuleConfig }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const subjects = useMyLmsSubjects();
  const announcements = useAnnouncements();

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const groups = useMemo<ResultGroup[]>(() => {
    const q = query.trim();
    if (!q) return [];

    const pageRows: ResultRow[] = moduleConfig.navGroups
      .flatMap((g) => g.items)
      .filter((item) => matches(q, item.label))
      .slice(0, MAX_PER_GROUP)
      .map((item) => ({ key: `page-${item.key}`, href: item.href, icon: item.icon, title: item.label }));

    const courseRows: ResultRow[] = (subjects.data ?? [])
      .filter((s) => matches(q, s.subject_name, s.subject_code))
      .slice(0, MAX_PER_GROUP)
      .map((s) => ({
        key: `course-${s.subject_id}`,
        href: `${moduleConfig.basePath}/lms/${s.subject_id}`,
        icon: "menu_book",
        title: s.subject_name,
        meta: s.subject_code,
      }));

    const announcementRows: ResultRow[] = (announcements.data ?? [])
      .filter((a) => matches(q, a.title, a.content))
      .slice(0, MAX_PER_GROUP)
      .map((a) => ({
        key: `announcement-${a.id}`,
        href: `${moduleConfig.basePath}/announcements`,
        icon: "campaign",
        title: a.title,
        meta: a.posted_by?.name,
      }));

    const result: ResultGroup[] = [];
    if (pageRows.length) result.push({ label: "Pages", rows: pageRows });
    if (courseRows.length) result.push({ label: "Courses", rows: courseRows });
    if (announcementRows.length) result.push({ label: "Announcements", rows: announcementRows });
    return result;
  }, [query, moduleConfig, subjects.data, announcements.data]);

  const totalResults = groups.reduce((sum, g) => sum + g.rows.length, 0);

  function handleSelect() {
    setOpen(false);
    setQuery("");
  }

  return (
    // flex-[50_1_0%] (not just flex-1) is required: Topbar's own spacer div
    // right after this one is ALSO flex-1, so an even flex-1/flex-1 split
    // would cap this at half the header's leftover space - usually well
    // under max-w-[640px] once the program/semester pills eat into that
    // leftover. Growing 50x faster than the spacer means this claims
    // (up to) its own max-width first, and the spacer only absorbs
    // whatever's left to push the pills to the right edge.
    <div ref={containerRef} className="relative flex-[50_1_0%]">
      <SearchBar
        placeholder="Search courses, results, announcements..."
        className="max-w-[640px] w-full"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => query && setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          if (e.key === "Enter" && groups[0]?.rows[0]) {
            const href = groups[0].rows[0].href;
            handleSelect();
            router.push(href);
          }
        }}
      />

      {open && query.trim() && (
        <div className="absolute top-[calc(100%+6px)] left-0 z-30 max-h-[420px] w-[420px] overflow-y-auto rounded-[12px] border border-border-default bg-surface py-2 shadow-lg">
          {totalResults === 0 ? (
            <div className="px-4 py-6 text-center text-[13px] text-subtle">No results for &quot;{query}&quot;</div>
          ) : (
            groups.map((group) => (
              <div key={group.label} className="mb-1 last:mb-0">
                <div className="px-4 pt-1.5 pb-1 text-[10.5px] font-extrabold tracking-[.09em] text-subtle">
                  {group.label.toUpperCase()}
                </div>
                {group.rows.map((row) => (
                  <Link
                    key={row.key}
                    href={row.href}
                    onClick={handleSelect}
                    className={cn("flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-nav-hover")}
                  >
                    <Icon name={row.icon} size={17} className="shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-semibold text-ink">{row.title}</div>
                      {row.meta && <div className="truncate text-[11.5px] text-muted">{row.meta}</div>}
                    </div>
                  </Link>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
