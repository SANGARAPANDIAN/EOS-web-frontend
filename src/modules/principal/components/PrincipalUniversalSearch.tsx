"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { principalColors } from "@/modules/principal/theme";
import { useUniversalSearch } from "@/modules/principal/api/search";

type CategoryKey = "all" | "students" | "faculty" | "departments" | "approvals" | "announcements";

const CATEGORY_TABS: { key: CategoryKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "students", label: "Students" },
  { key: "faculty", label: "Faculty" },
  { key: "departments", label: "Departments" },
  { key: "approvals", label: "Approvals" },
  { key: "announcements", label: "Announcements" },
];

interface ResultRow {
  key: string;
  icon: string;
  title: string;
  subtitle: string;
  onSelect: () => void;
}

interface PrincipalUniversalSearchProps {
  onClose: () => void;
}

/** Only ever rendered while open (parent conditionally mounts it) — closing unmounts it, so state naturally resets fresh on the next open with no reset effect needed. */
export function PrincipalUniversalSearch({ onClose }: PrincipalUniversalSearchProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [rawInput, setRawInput] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [tab, setTab] = useState<CategoryKey>("all");

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(rawInput), 250);
    return () => clearTimeout(timer);
  }, [rawInput]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const search = useUniversalSearch(debouncedQ);

  const go = useCallback(
    (href: string) => {
      router.push(href);
      onClose();
    },
    [router, onClose],
  );

  const rows: ResultRow[] = useMemo(() => {
    const data = search.data;
    if (!data) return [];

    const students: ResultRow[] = data.students.map((s) => ({
      key: `student-${s.id}`,
      icon: "school",
      title: s.name,
      subtitle: [s.register_no, s.department_code].filter(Boolean).join(" · "),
      onSelect: () => go(`/principal/students?q=${encodeURIComponent(s.register_no ?? s.name)}`),
    }));
    const faculty: ResultRow[] = data.faculty.map((f) => ({
      key: `faculty-${f.id}`,
      icon: "person",
      title: f.name,
      subtitle: [f.designation, f.department_code].filter(Boolean).join(" · "),
      onSelect: () => go(`/principal/faculty?q=${encodeURIComponent(f.name)}`),
    }));
    const departments: ResultRow[] = data.departments.map((d) => ({
      key: `department-${d.id}`,
      icon: "apartment",
      title: d.name,
      subtitle: d.code,
      onSelect: () => go(`/principal/departments?id=${d.id}`),
    }));
    const approvals: ResultRow[] = data.approvals.map((a) => ({
      key: `approval-${a.kind}-${a.id}`,
      icon: a.kind === "leave" ? "event_busy" : "directions_walk",
      title: `${a.faculty_name} · ${a.summary}`,
      subtitle: `${a.kind.toUpperCase()} · ${a.status}`,
      onSelect: () => go(`/principal/approvals?q=${encodeURIComponent(a.faculty_name)}`),
    }));
    const announcements: ResultRow[] = data.announcements.map((a) => ({
      key: `announcement-${a.id}`,
      icon: "campaign",
      title: a.title,
      subtitle: "Announcement",
      onSelect: () => go("/principal/announcements"),
    }));

    if (tab === "students") return students;
    if (tab === "faculty") return faculty;
    if (tab === "departments") return departments;
    if (tab === "approvals") return approvals;
    if (tab === "announcements") return announcements;
    return [...students, ...faculty, ...departments, ...approvals, ...announcements];
  }, [search.data, tab, go]);

  const trimmed = rawInput.trim();
  const showHint = trimmed.length > 0 && trimmed.length < 2;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[12vh]" onClick={onClose}>
      <div
        className="flex w-full max-w-xl flex-col overflow-hidden rounded-2xl border shadow-[0_30px_70px_rgba(8,15,35,0.25)]"
        style={{ background: principalColors.bg, borderColor: principalColors.border }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 border-b px-4" style={{ borderColor: principalColors.borderLight }}>
          <Icon name="search" size={20} style={{ color: principalColors.textFaint }} />
          <input
            ref={inputRef}
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            placeholder="Search students, faculty, departments, approvals, announcements…"
            className="h-14 flex-1 border-0 bg-transparent text-[15px] outline-none"
            style={{ color: principalColors.heading }}
          />
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border px-1.5 py-0.5 text-[11px]"
            style={{
              fontFamily: "var(--font-jetbrains-mono)",
              color: principalColors.textFaint,
              background: principalColors.borderLight,
              borderColor: principalColors.border,
            }}
          >
            Esc
          </button>
        </div>

        <div className="flex gap-1 border-b px-3 py-2" style={{ borderColor: principalColors.borderLight }}>
          {CATEGORY_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className="rounded-lg px-2.5 py-1.5 text-[13px] font-semibold"
              style={
                tab === t.key
                  ? { background: principalColors.surfaceTint, color: principalColors.primaryDark }
                  : { color: principalColors.textFaint }
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="max-h-[50vh] overflow-y-auto">
          {trimmed.length === 0 && (
            <div className="px-5 py-10 text-center text-sm" style={{ color: principalColors.textFaint }}>
              Start typing to search across the institution.
            </div>
          )}

          {showHint && (
            <div className="px-5 py-10 text-center text-sm" style={{ color: principalColors.textFaint }}>
              Keep typing — at least 2 characters.
            </div>
          )}

          {!showHint && trimmed.length >= 2 && search.isLoading && (
            <div className="flex flex-col gap-1 p-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-2.5">
                  <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="mt-1.5 h-3.5 w-24" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!showHint && trimmed.length >= 2 && !search.isLoading && rows.length === 0 && (
            <div className="px-5 py-10 text-center text-sm" style={{ color: principalColors.textFaint }}>
              No results for &quot;{trimmed}&quot;.
            </div>
          )}

          {!search.isLoading && rows.length > 0 && (
            <div className="flex flex-col gap-0.5 p-2">
              {rows.map((row) => (
                <button
                  key={row.key}
                  type="button"
                  onClick={row.onSelect}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:brightness-[0.98]"
                  style={{ background: "transparent" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = principalColors.surfaceMuted)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <div
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg"
                    style={{ background: principalColors.surfaceTint, color: principalColors.primaryDark }}
                  >
                    <Icon name={row.icon} size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold" style={{ color: principalColors.heading }}>
                      {row.title}
                    </div>
                    <div className="truncate text-xs" style={{ color: principalColors.textFaint }}>
                      {row.subtitle}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
