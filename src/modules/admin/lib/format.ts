/** ₹ amounts arrive from the backend as decimal strings (Prisma.Decimal → string). */
export function currencyShort(amount: string | number): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(n)) return "₹0";
  if (Math.abs(n) >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)} Cr`;
  if (Math.abs(n) >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1)} L`;
  if (Math.abs(n) >= 1_000) return `₹${(n / 1_000).toFixed(1)} K`;
  return `₹${n.toFixed(0)}`;
}

export function monthShortLabel(yyyyMm: string): string {
  const [year, month] = yyyyMm.split("-").map(Number);
  if (!year || !month) return yyyyMm;
  return new Date(year, month - 1, 1).toLocaleString("en-US", { month: "short" });
}

export function percent1(value: number): string {
  return `${value.toFixed(1)}%`;
}
