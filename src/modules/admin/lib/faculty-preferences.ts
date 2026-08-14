"use client";

import { useState } from "react";

// Client-only display preferences for the faculty list — no backend/DB
// support for this exists yet, so it's stored locally per browser rather
// than per-user server-side. Mirrors the old console's identical hook.
export interface FacultyListPreferences {
  pageSize: number;
  sortDirection: "asc" | "desc";
  hiddenColumns: string[];
}

// Only these columns are ever toggleable — matches the old console's list.
// There's no column-visibility menu wired up yet (the list page's
// "Columns" button just shows a "coming soon" toast), so hiddenColumns
// stays empty in practice, but the preference shape is kept ready for when
// that menu exists.
export const FACULTY_LIST_COLUMNS: { key: string; label: string }[] = [
  { key: "designation", label: "Designation" },
  { key: "department", label: "Department" },
  { key: "email", label: "Email" },
  { key: "date_of_joining", label: "Date of joining" },
  { key: "status", label: "Status" },
];

const STORAGE_KEY = "eos.admin.faculty.listPreferences";

const DEFAULT_PREFERENCES: FacultyListPreferences = {
  pageSize: 10,
  sortDirection: "asc",
  hiddenColumns: [],
};

function readPreferences(): FacultyListPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PREFERENCES, ...parsed };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function writePreferences(prefs: FacultyListPreferences) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Storage unavailable (private mode, quota) — preference just won't persist.
  }
}

export function useFacultyPreferences() {
  const [preferences, setPreferences] = useState<FacultyListPreferences>(readPreferences);

  function updatePreferences(partial: Partial<FacultyListPreferences>) {
    setPreferences((prev) => {
      const next = { ...prev, ...partial };
      writePreferences(next);
      return next;
    });
  }

  function toggleColumn(key: string) {
    setPreferences((prev) => {
      const hidden = new Set(prev.hiddenColumns);
      if (hidden.has(key)) hidden.delete(key);
      else hidden.add(key);
      const next = { ...prev, hiddenColumns: Array.from(hidden) };
      writePreferences(next);
      return next;
    });
  }

  return { preferences, updatePreferences, toggleColumn };
}
