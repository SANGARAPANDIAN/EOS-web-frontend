const ROMAN_YEAR = ["I", "II", "III", "IV", "V", "VI"];

/**
 * Semesters 1-2 -> "I", 3-4 -> "II", 5-6 -> "III", 7-8 -> "IV", etc.
 * Extracted from hod/my-class/subject-records/page.tsx so every page showing
 * a section label (Departments & HoDs, Placements, subject-records) uses the
 * same "III-A" style instead of each re-deriving it independently.
 */
export function yearLabelForSemester(semester: number | null | undefined): string {
  if (semester == null) return "";
  const yearIndex = Math.ceil(semester / 2) - 1;
  return ROMAN_YEAR[yearIndex] ?? String(yearIndex + 1);
}

/** "III-A" style combined year+section label; falls back to just the section when semester is unknown. */
export function sectionLabel(semester: number | null | undefined, section: string | null | undefined): string {
  if (!section) return "";
  const year = yearLabelForSemester(semester);
  return year ? `${year}-${section}` : section;
}
