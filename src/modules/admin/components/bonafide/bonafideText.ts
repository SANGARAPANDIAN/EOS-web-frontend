export function genderTitle(gender: string | null): string {
  const g = gender?.trim().toLowerCase();
  if (g === "male") return "Mr.";
  if (g === "female") return "Ms.";
  return "Mr./Ms.";
}

export function relationPrefix(gender: string | null): string {
  const g = gender?.trim().toLowerCase();
  if (g === "male") return "S/o";
  if (g === "female") return "D/o";
  return "S/o/D/o";
}

export function formatStudentName(first: string | null, last: string | null): string {
  return [first, last].filter(Boolean).join(" ").trim().toUpperCase() || "—";
}

/** "Dt.DD/MM/YYYY" — the letterhead's own date format, distinct from the app's usual long-form date. */
export function formatDateSlash(iso: string | null): string {
  const date = iso ? new Date(iso) : new Date();
  if (Number.isNaN(date.getTime())) return "—";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${date.getFullYear()}`;
}

/** Current academic year as of `referenceDate` (July start), full 4-digit years — "2025-2026" for the ref number, "2025 - 2026" (spaced) for the body text. */
export function currentAcademicYearFull(referenceDate: Date, separator: "-" | " - " = "-"): string {
  const startYear = referenceDate.getMonth() >= 5 ? referenceDate.getFullYear() : referenceDate.getFullYear() - 1;
  return `${startYear}${separator}${startYear + 1}`;
}

const YEAR_OF_STUDY_WORDS = ["First", "Second", "Third", "Fourth", "Fifth", "Sixth"];

/** "Second" / "Third" etc. — derived from the batch's real start year vs the current academic year, same math the app already uses elsewhere to place a batch into I/II/III/IV Year. */
export function yearOfStudyWord(batchName: string | null, referenceDate: Date): string {
  const startYear = batchName ? parseInt(batchName.slice(0, 4), 10) : NaN;
  if (!Number.isFinite(startYear)) return "—";
  const academicStartYear = referenceDate.getMonth() >= 5 ? referenceDate.getFullYear() : referenceDate.getFullYear() - 1;
  const ordinal = academicStartYear - startYear + 1;
  return YEAR_OF_STUDY_WORDS[ordinal - 1] ?? `Year ${ordinal}`;
}

/** "SECE/G.Q/2025-2026/AD/456" — SECE and "G.Q" are fixed institutional constants; academic year and department code are real, the trailing segment is the request's own id (no dedicated certificate-number column exists). */
export function bonafideRefNo(requestId: number, departmentCode: string | null, referenceDate: Date): string {
  return `SECE/G.Q/${currentAcademicYearFull(referenceDate)}/${departmentCode ?? "GEN"}/${requestId}`;
}
