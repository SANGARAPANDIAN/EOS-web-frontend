"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { SearchBar } from "@/components/ui/SearchBar";
import { HeaderSearch } from "@/components/layout/HeaderSearch";
import { cn } from "@/lib/utils/cn";
import type { ModuleConfig } from "@/modules/types";

export interface TopbarSearchResult {
  section: string;
  title: string;
  sub: string;
  onSelect: () => void;
}

export interface TopbarSearchConfig {
  placeholder?: string;
  query: string;
  onQueryChange: (value: string) => void;
  results: TopbarSearchResult[];
  isLoading?: boolean;
}

export interface TopbarQuickCreateItem {
  label: string;
  onSelect: () => void;
}

export interface TopbarQuickCreateConfig {
  items: TopbarQuickCreateItem[];
}

interface TopbarProps {
  moduleConfig: ModuleConfig;
  programLabel?: string;
  /** Material Symbols ligature name for the programLabel pill's icon — defaults to "school" (the academic-program reading every other module uses it for). */
  programIcon?: string;
  academicYearLabel?: string;
  semesterParityLabel?: string;
  unreadNotifications?: number;
  /** Omit for modules that use the shared `HeaderSearch` default (pages/courses/announcements) — provide this only when a module needs fully custom search behaviour/results (e.g. a role with its own cross-entity search endpoint). */
  search?: TopbarSearchConfig;
  /** Omit to hide the "+" button entirely — opt-in, same as `search`. */
  quickCreate?: TopbarQuickCreateConfig;
}

export function Topbar({
  moduleConfig,
  programLabel,
  programIcon = "school",
  academicYearLabel,
  semesterParityLabel,
  unreadNotifications = 0,
  search,
  quickCreate,
}: TopbarProps) {
  const [open, setOpen] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const quickCreateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!search) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [search]);

  useEffect(() => {
    if (!quickCreate) return;
    function handleClickOutside(e: MouseEvent) {
      if (quickCreateRef.current && !quickCreateRef.current.contains(e.target as Node)) {
        setQuickCreateOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [quickCreate]);

  return (
    <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-border-default bg-white/92 px-7 py-3 backdrop-blur-[8px]">
      {search ? (
        <div ref={containerRef} className="relative flex-[50_1_0%]">
          <SearchBar
            placeholder={search.placeholder ?? "Search…"}
            className="max-w-[640px] w-full"
            value={search.query}
            onChange={(e) => {
              search.onQueryChange(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
          />
          {open && search.query.trim().length >= 2 && (
            <div className="absolute top-[calc(100%+6px)] left-0 right-0 z-30 max-h-[360px] overflow-y-auto rounded-card border border-border-default bg-surface shadow-modal">
              {search.isLoading ? (
                <div className="px-4 py-3.5 text-[13px] text-muted">Searching…</div>
              ) : search.results.length === 0 ? (
                <div className="px-4 py-3.5 text-[13px] text-muted">No matches. Try a discipline, athlete or venue name.</div>
              ) : (
                search.results.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      r.onSelect();
                      setOpen(false);
                    }}
                    className="flex w-full items-center justify-between gap-3 border-t border-divider px-4 py-3 text-left first:border-0 hover:bg-nav-hover"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-[13.5px] font-bold text-ink">{r.title}</div>
                      {r.sub && <div className="truncate text-[12px] text-muted">{r.sub}</div>}
                    </div>
                    <span className="shrink-0 rounded-pill bg-divider px-2.5 py-1 text-[10.5px] font-bold text-muted">
                      {r.section}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      ) : (
        <HeaderSearch moduleConfig={moduleConfig} />
      )}
      <div className="flex-1" />

      {programLabel && (
        <div className="flex items-center gap-2 rounded-pill border border-border-default px-3.5 py-2 text-[13px] font-semibold text-ink-soft">
          <Icon name={programIcon} size={17} className="text-primary" />
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

      {quickCreate && (
        <div ref={quickCreateRef} className="relative">
          <IconButton icon="add" aria-label="Quick create" onClick={() => setQuickCreateOpen((v) => !v)} />
          {quickCreateOpen && (
            <div className="absolute top-[calc(100%+6px)] right-0 z-30 min-w-[200px] overflow-hidden rounded-card border border-border-default bg-surface py-1.5 shadow-modal">
              {quickCreate.items.map((item, i) => (
                <button
                  key={i}
                  onClick={() => {
                    item.onSelect();
                    setQuickCreateOpen(false);
                  }}
                  className="block w-full px-4 py-2.5 text-left text-[13px] font-semibold text-ink hover:bg-nav-hover"
                >
                  {item.label}
                </button>
              ))}
            </div>
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
