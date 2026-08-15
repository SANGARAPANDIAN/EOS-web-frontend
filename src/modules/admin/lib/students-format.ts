export function studentName(first: string | null, last: string | null): string {
  const name = [first, last].filter(Boolean).join(" ").trim();
  return name || "—";
}

export function initials(first: string | null, last: string | null): string {
  const chars = [first?.[0], last?.[0]].filter(Boolean).join("").toUpperCase();
  return chars || "?";
}

const TINTS = [
  { bg: "#dbeafe", fg: "#1d47ae" },
  { bg: "#dcfce7", fg: "#0f6b45" },
  { bg: "#fef3c7", fg: "#92400e" },
  { bg: "#fce7f3", fg: "#be185d" },
  { bg: "#ede9fe", fg: "#6d28d9" },
  { bg: "#cffafe", fg: "#0e7490" },
];

/** Deterministic avatar tint from a student id — same id always gets the same colour. */
export function avatarTint(id: number): { bg: string; fg: string } {
  return TINTS[id % TINTS.length];
}

export function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatCurrency(value: string | number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    Number(value),
  );
}
