/**
 * Marks-obtained/max-marks -> percentage, rounded to 1 decimal place.
 * Extracted from the ad hoc duplicate in exam-results-grid.service.ts /
 * subject-records.service.ts (backend) so every "converted to 100" display
 * on the frontend computes it identically.
 */
export function toPercentage(obtained: number | null | undefined, max: number | null | undefined): number | null {
  if (obtained == null || max == null || max <= 0) return null;
  return Math.round((obtained / max) * 1000) / 10;
}

/**
 * Percentage -> letter grade. Extracted from the local copy in
 * MarkEntryPanel.tsx so SubjectMarksTable (and anything else showing a
 * grade badge) bands identically.
 */
export function gradeOf(pct: number | null | undefined): string | null {
  if (pct == null) return null;
  if (pct >= 91) return "O";
  if (pct >= 81) return "A+";
  if (pct >= 71) return "A";
  if (pct >= 61) return "B+";
  if (pct >= 50) return "B";
  return "RA";
}

export function gradeTone(grade: string): "accent" | "accentDark" | "danger" {
  if (grade === "RA") return "danger";
  if (grade === "O" || grade === "A+") return "accentDark";
  return "accent";
}
