/**
 * Institution policy constants that have no backing config endpoint yet.
 * Centralized here (rather than scattered as magic numbers) so they're a
 * one-line change if the backend later exposes them or the policy differs.
 */
export const ATTENDANCE_THRESHOLD_PERCENT = 75;

/**
 * Matches the real, live `grade_bands` table this college's backend already
 * uses (see EOSbackend1 docs/gpa_implementation_plan.md A.3) — O 90+/A+
 * 80+/A 70+/B+ 60+/B 50+/RA below. This used to be 91/81/71/61/50/0 (a
 * stale, unverified guess — the doc comment here claimed the backend had
 * "no grade/GPA computation anywhere", which was already false even before
 * this fix: `buildMarksheetData`'s own SGPA has always been correct), and
 * that 1-point drift silently mis-graded any student scoring exactly on a
 * boundary (e.g. 90% showed as A+ here, O everywhere else) — caught via
 * live verification, not a hypothetical.
 *
 * This is still a stopgap, not the fix: the real fix is for this page (and
 * `useMyCgpa` below) to read the backend's own computed grade/SGPA/CGPA
 * instead of recomputing from raw scores — tracked as part of the shared
 * GPA service migration in the backend's gpa_implementation_plan.md.
 */
export const GRADE_SCALE: { min: number; grade: string; point: number }[] = [
  { min: 90, grade: "O", point: 10 },
  { min: 80, grade: "A+", point: 9 },
  { min: 70, grade: "A", point: 8 },
  { min: 60, grade: "B+", point: 7 },
  { min: 50, grade: "B", point: 6 },
  { min: 0, grade: "RA", point: 0 },
];

export function percentageToGrade(percentage: number): { grade: string; point: number } {
  const tier = GRADE_SCALE.find((t) => percentage >= t.min) ?? GRADE_SCALE[GRADE_SCALE.length - 1];
  return { grade: tier.grade, point: tier.point };
}

/** RA ("reappear") is the only failing grade on the scale — the same 50% boundary the grade scale already draws. */
export function isPassingPercentage(percentage: number): boolean {
  return percentageToGrade(percentage).grade !== "RA";
}

/** Credit-weighted GPA over subjects with a known credit value; subjects missing credits are excluded. */
export function computeGpa(subjects: { percentage: number; credits: number | null | undefined }[]): number | null {
  const weighted = subjects.filter((s) => s.credits != null && s.credits > 0);
  if (weighted.length === 0) return null;
  const totalCredits = weighted.reduce((sum, s) => sum + (s.credits as number), 0);
  const totalPoints = weighted.reduce((sum, s) => sum + percentageToGrade(s.percentage).point * (s.credits as number), 0);
  return Math.round((totalPoints / totalCredits) * 100) / 100;
}

/**
 * How many more consecutive "present" classes (each one adding to both
 * present and total) it takes to bring present/total up to the threshold.
 * Solves (present + x) / (total + x) >= threshold for the smallest integer
 * x >= 0. Returns 0 if already at/above threshold.
 */
export function classesToReachThreshold(present: number, total: number, thresholdPercent: number): number {
  const t = thresholdPercent / 100;
  if (total === 0 || present / total >= t) return 0;
  const x = (t * total - present) / (1 - t);
  return Math.max(0, Math.ceil(x));
}

/** ROLES constant (backend, roles.constant.ts) — display labels for a real `roles.name` value, e.g. an announcement's resolved poster role. */
export const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  principal: "Principal",
  hod: "HoD",
  faculty: "Faculty",
  student: "Student",
  parent: "Parent",
  coe: "Controller of Examinations",
  placement: "Placement Cell",
  library: "Library",
  billing: "Billing",
  hr_payroll: "HR & Payroll",
  finance: "Finance",
  iqac: "IQAC",
  secretary: "Secretary",
  gate_warden: "Gate Warden",
  media_room: "Media Room",
  academic_coordinator: "Academic Coordinator",
  alumni: "Alumni",
};

/** drive_application_status_enum (schema.prisma) — shared between the Placements page and the Dashboard's next-drive tile. */
export const APPLICATION_STATUS_LABEL: Record<string, string> = {
  applied: "Applied",
  r1_cleared: "Round 1 cleared",
  r2_cleared: "Round 2 cleared",
  r3_cleared: "Round 3 cleared",
  rejected: "Not selected",
  placed: "Placed",
};
