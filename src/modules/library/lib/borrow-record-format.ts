import type { BadgeTone } from "@/modules/admin/components/ui";
import type { BorrowRecord } from "@/modules/library/api/borrowRecords";

export function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatCurrency(value: number | null): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value);
}

export function borrowStatusTone(record: BorrowRecord): BadgeTone {
  if (record.is_lost || record.is_damaged) return "danger";
  if (record.is_overdue) return "warning";
  if (record.status === "returned") return "neutral";
  return "primary";
}

/** is_overdue wins over the raw persisted status — an unreturned overdue book reads as "Overdue", not "Borrowed". */
export function borrowStatusLabel(record: BorrowRecord): string {
  if (record.is_overdue) return "Overdue";
  switch (record.status) {
    case "borrowed":
      return "Borrowed";
    case "returned":
      return "Returned";
    case "lost":
      return "Lost";
    case "damaged":
      return "Damaged";
    default:
      return record.status;
  }
}

export function borrowerName(record: BorrowRecord): string {
  return record.student?.name ?? record.faculty?.name ?? "Unknown";
}
