/** Design's date convention throughout COE: "24 Dec 2026". Accepts an ISO date/datetime string. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** Thousands-separated integer for dashboard tiles: 9847 → "9,847". */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-IN").format(Math.round(value));
}

/** Compact ₹ amount for tight spaces (sidebar badges): ₹30.3k, ₹1.4L, ₹850. */
export function formatCompactCurrency(amount: number): string {
  if (amount >= 100_000) return `₹${Math.round((amount / 100_000) * 10) / 10}L`;
  if (amount >= 1_000) return `₹${Math.round((amount / 1_000) * 10) / 10}k`;
  return `₹${Math.round(amount)}`;
}
