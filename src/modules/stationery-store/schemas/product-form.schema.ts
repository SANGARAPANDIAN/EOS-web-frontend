import { z } from "zod";
import { optionalNumber, optionalText } from "./field-helpers";

export const productFormSchema = z
  .object({
    category: z.enum(["study", "food", "care", "hostel", "college"]).optional(),
    name: z.string().trim().min(1, "Product name is required").max(150),
    price: optionalNumber({ min: 0 }),
    original_price: optionalNumber({ min: 0 }),
    stock_quantity: optionalNumber({ int: true, min: 0 }),
    low_stock_threshold: optionalNumber({ int: true, min: 0 }),
    image_url: optionalText(500),
  })
  .refine((v) => v.category !== undefined, { path: ["category"], message: "Choose a category" })
  .refine((v) => v.price !== undefined, { path: ["price"], message: "Enter a valid price" })
  .refine((v) => v.stock_quantity !== undefined, { path: ["stock_quantity"], message: "Stock quantity is required" })
  .refine((v) => v.original_price === undefined || v.price === undefined || v.original_price > v.price, {
    path: ["original_price"],
    message: "Must be greater than price",
  });

export type ProductFormValues = z.infer<typeof productFormSchema>;
