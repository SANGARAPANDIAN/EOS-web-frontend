import { z } from "zod";
import { optionalNumber, optionalText } from "@/modules/library/schemas/field-helpers";

const baseSchema = z.object({
  books_per_student: optionalNumber({ int: true, min: 1 }),
  default_borrowing_days: optionalNumber({ int: true, min: 1 }),
  max_renewals: optionalNumber({ int: true, min: 0 }),
  renewal_extension_days: optionalNumber({ int: true, min: 1 }),
  fine_per_day: optionalNumber({ min: 0 }),
  lost_book_processing_fee: optionalNumber({ min: 0 }),
  // A 0-1 fraction of the book's price, not a currency amount.
  damaged_book_charge_rate: optionalNumber({ min: 0, max: 1 }),
  grace_period_days: optionalNumber({ int: true, min: 0 }),
  block_issue_above_fine: optionalNumber({ min: 0 }),
  barcode_format: optionalText(30),
  spine_label_prefix: optionalText(20),
  counter_opens_at: optionalText(10),
  counter_closes_at: optionalText(10),
});

const REQUIRED_NUMERIC_FIELDS: { key: keyof z.infer<typeof baseSchema>; message: string }[] = [
  { key: "books_per_student", message: "Books per student is required" },
  { key: "default_borrowing_days", message: "Default borrowing period is required" },
  { key: "max_renewals", message: "Max renewals is required" },
  { key: "renewal_extension_days", message: "Renewal extension is required" },
  { key: "fine_per_day", message: "Fine per day is required" },
  { key: "lost_book_processing_fee", message: "Lost-book processing fee is required" },
  { key: "damaged_book_charge_rate", message: "Damaged-book charge rate is required" },
  { key: "grace_period_days", message: "Grace period is required" },
  { key: "block_issue_above_fine", message: "Block-issue fine threshold is required" },
];

// The backend DTO treats every numeric field as optional (a PATCH can touch
// just one), but this form always loads pre-filled from the current
// settings — so clearing a field here should read as "please provide a
// value," not "leave unchanged," which is why these 9 are force-required at
// the form layer even though the schema they PATCH against doesn't require them.
export const settingsFormSchema = baseSchema.superRefine((values, ctx) => {
  for (const { key, message } of REQUIRED_NUMERIC_FIELDS) {
    if (values[key] === undefined) {
      ctx.addIssue({ code: "custom", path: [key], message });
    }
  }
});

export type SettingsFormValues = z.infer<typeof baseSchema>;
