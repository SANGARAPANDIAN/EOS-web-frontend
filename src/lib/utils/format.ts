/** Compact ₹ amount for tight spaces (sidebar badges): ₹30.3k, ₹1.4L, ₹850. */
export function formatCompactCurrency(amount: number): string {
  if (amount >= 100_000) return `₹${Math.round((amount / 100_000) * 10) / 10}L`;
  if (amount >= 1_000) return `₹${Math.round((amount / 1_000) * 10) / 10}k`;
  return `₹${Math.round(amount)}`;
}
