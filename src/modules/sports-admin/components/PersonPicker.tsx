"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui";
import { useStudentLookup, useFacultyLookup } from "@/modules/sports-admin/api/lookup";
import { cn } from "@/lib/utils/cn";

export interface PickedPerson {
  id: number;
  name: string;
  meta: string;
}

interface PersonPickerProps {
  type: "student" | "faculty";
  value: PickedPerson | null;
  onChange: (person: PickedPerson | null) => void;
  placeholder?: string;
  required?: boolean;
  /** Ids to hide from the results — e.g. squad members already on the roster, so the picker can't re-offer someone who'd just be a duplicate add. */
  excludeIds?: number[];
}

/**
 * Search-as-you-type picker used everywhere a form needs to attach a real
 * person — students are matched by roll number, register number, admission
 * number or name; faculty by name or email. The form only ever ends up
 * holding the resolved internal id; nobody has to know or type it.
 */
export function PersonPicker({ type, value, onChange, placeholder, required, excludeIds }: PersonPickerProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const studentResults = useStudentLookup(type === "student" ? debouncedQuery : "");
  const facultyResults = useFacultyLookup(type === "faculty" ? debouncedQuery : "");
  const excludeSet = new Set(excludeIds ?? []);
  const results = (
    type === "student"
      ? (studentResults.data ?? []).map((r) => ({
          id: r.id,
          name: r.name,
          meta: [r.roll_no, r.meta].filter(Boolean).join(" · "),
        }))
      : (facultyResults.data ?? []).map((r) => ({
          id: r.id,
          name: r.name,
          meta: [r.designation, r.meta].filter(Boolean).join(" · "),
        }))
  ).filter((r) => !excludeSet.has(r.id));
  const isLoading = type === "student" ? studentResults.isFetching : facultyResults.isFetching;

  if (value) {
    return (
      <div className="flex items-center gap-2.5 rounded-input border border-border-default bg-surface-input px-[13px] py-[9px]">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13.5px] font-bold text-ink">{value.name}</div>
          {value.meta && <div className="truncate text-[11.5px] text-muted">{value.meta}</div>}
        </div>
        <button
          type="button"
          onClick={() => {
            onChange(null);
            setQuery("");
          }}
          className="flex size-6 shrink-0 items-center justify-center rounded-full text-muted hover:bg-divider hover:text-ink"
          title="Clear"
        >
          <Icon name="close" size={15} />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-2.5 rounded-input border border-border-default bg-surface px-[13px] py-[11px] focus-within:border-border-accent">
        <Icon name="search" size={17} className="text-subtle" />
        <input
          value={query}
          required={required}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={
            placeholder ?? (type === "student" ? "Search by roll no. or name…" : "Search by name or email…")
          }
          className="w-full min-w-0 border-0 bg-transparent text-[13.5px] text-ink placeholder:text-subtle focus:outline-none"
        />
      </div>

      {open && debouncedQuery.trim().length >= 2 && (
        <div className="absolute top-[calc(100%+4px)] left-0 right-0 z-20 max-h-[280px] overflow-y-auto rounded-card-sm border border-border-default bg-surface shadow-modal">
          {isLoading ? (
            <div className="px-4 py-3 text-[12.5px] text-muted">Searching…</div>
          ) : results.length === 0 ? (
            <div className="px-4 py-3 text-[12.5px] text-muted">No matches.</div>
          ) : (
            results.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  onChange(r);
                  setQuery("");
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full flex-col items-start gap-0.5 border-t border-divider px-4 py-2.5 text-left first:border-0 hover:bg-nav-hover",
                )}
              >
                <span className="text-[13px] font-bold text-ink">{r.name}</span>
                {r.meta && <span className="text-[11.5px] text-muted">{r.meta}</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
