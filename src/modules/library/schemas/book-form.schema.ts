import { z } from "zod";
import { optionalNumber, optionalText } from "@/modules/library/schemas/field-helpers";

export const bookFormSchema = z
  .object({
    qr_code: z.string().trim().min(1, "QR / accession code is required").max(100),
    title: z.string().trim().min(1, "Title is required").max(255),
    author: optionalText(255),
    isbn: optionalText(20),
    publisher: optionalText(255),
    edition: optionalText(50),
    category_id: optionalNumber({ int: true, min: 1 }),
    department_id: optionalNumber({ int: true, min: 1 }),
    rack_id: optionalNumber({ int: true, min: 1 }),
    total_copies: optionalNumber({ int: true, min: 1 }),
    // Defaults to total copies if left blank — see BookFormModal.
    available_copies: optionalNumber({ int: true, min: 0 }),
    price_per_copy: optionalNumber({ min: 0 }),
    vendor_fund: optionalText(255),
  })
  .refine((v) => v.category_id !== undefined, { path: ["category_id"], message: "Choose a category" })
  .refine((v) => v.total_copies !== undefined, { path: ["total_copies"], message: "Total copies is required" })
  .refine((v) => v.available_copies === undefined || v.total_copies === undefined || v.available_copies <= v.total_copies, {
    path: ["available_copies"],
    message: "Cannot exceed total copies",
  });

export type BookFormValues = z.infer<typeof bookFormSchema>;
