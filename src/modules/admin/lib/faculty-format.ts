import type { Faculty } from "@/modules/admin/api/faculty";

// Backend doesn't return a display code (no such field in the confirmed
// DTOs) — derived client-side purely for display, matching the old
// console's "FAC0007"-style convention. Not a real identifier.
export function formatFacultyCode(id: number): string {
  return `FAC${String(id).padStart(4, "0")}`;
}

interface NameParts {
  prefix?: string | null;
  first_name: string;
  last_name: string;
}

// Structural (not `Pick<Faculty, ...>`) so any faculty-shaped object with an
// optional `prefix` can use this without extending `Faculty` itself.
export function fullName(faculty: NameParts): string {
  const prefix = faculty.prefix?.trim();
  return `${prefix ? `${prefix} ` : ""}${faculty.first_name} ${faculty.last_name}`.trim();
}

export function initialsOf(faculty: Pick<Faculty, "first_name" | "last_name">): string {
  const first = faculty.first_name?.[0] ?? "";
  const last = faculty.last_name?.[0] ?? "";
  return `${first}${last}`.toUpperCase() || "?";
}

const AVATAR_TONES = [
  { bg: "#fff1f2", fg: "#be123c" },
  { bg: "#dbeafe", fg: "#1d47ae" },
  { bg: "#dcfce7", fg: "#0f6b45" },
  { bg: "#fef3c7", fg: "#92400e" },
  { bg: "#ede9fe", fg: "#6d28d9" },
  { bg: "#cffafe", fg: "#0e7490" },
];

// A simple deterministic hash so the same faculty always gets the same
// avatar tone across renders/pages, without needing a backend field for it.
export function avatarToneFor(seed: number | string): { bg: string; fg: string } {
  const str = String(seed);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) & 0xffffffff;
  }
  return AVATAR_TONES[Math.abs(hash) % AVATAR_TONES.length];
}

export function formatDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// For a native <input type="date">'s `max` attribute — caps date-of-birth
// pickers at today, without reimplementing the native picker's UI.
export function todayDateInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

// A native <input type="date"> only accepts an exact "YYYY-MM-DD" value —
// the backend returns date-only fields as full ISO datetime strings, which
// the input can't render. Pre-slicing keeps the form's tracked value in sync
// with what the input actually displays.
export function toDateInputValue(value?: string | null): string {
  if (!value) return "";
  const sliced = value.slice(0, 10);
  return Number.isNaN(new Date(sliced).getTime()) ? "" : sliced;
}

// Approximate — based on calendar years elapsed, not day-precise.
export function experienceYears(dateOfJoining?: string | null): string {
  if (!dateOfJoining) return "—";
  const doj = new Date(dateOfJoining);
  if (Number.isNaN(doj.getTime())) return "—";
  const years = Math.max(0, Math.floor((Date.now() - doj.getTime()) / (365.25 * 24 * 3600 * 1000)));
  return `${years} year${years === 1 ? "" : "s"}`;
}

// Cheap completeness heuristic over fields the backend actually supports,
// since there's no backend-computed "profile complete" figure to show.
export function profileCompleteness(faculty: Faculty): number {
  const checks = [
    !!faculty.phone,
    !!faculty.date_of_joining,
    !!faculty.department_id,
    !!faculty.sensitive_info?.aadhar_number,
    !!faculty.sensitive_info?.pan_number,
    !!faculty.sensitive_info?.bank_account_number,
  ];
  const filled = checks.filter(Boolean).length;
  return Math.round(((2 + filled) / (2 + checks.length)) * 100);
}

export function maskTail(value?: string | null, keep = 4): string {
  if (!value) return "Not provided";
  if (value.length <= keep) return value;
  return `${"•".repeat(value.length - keep)}${value.slice(-keep)}`;
}
