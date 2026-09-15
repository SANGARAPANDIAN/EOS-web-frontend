const LABELS: Record<string, string> = {
  courses: "course",
  classes: "class",
  students: "student",
};

function pluralize(label: string, count: number): string {
  return count === 1 ? label : `${label}s`;
}

/** Turns a 409 ApiError's `details` payload (e.g. { courses: 1, classes: 5 }) into ["1 course", "5 classes"]. */
export function formatBlockers(details: Record<string, number> | undefined): string[] {
  if (!details) return [];
  return Object.entries(details)
    .filter(([, count]) => count > 0)
    .map(([key, count]) => `${count} ${pluralize(LABELS[key] ?? key, count)}`);
}
