import { z } from "zod";
import { optionalNumber, optionalText } from "@/modules/library/schemas/field-helpers";

export const rackFormSchema = z.object({
  rack_code: z.string().trim().min(1, "Rack code is required").max(30),
  shelves: optionalNumber({ int: true, min: 1 }),
  subject_range: optionalText(255),
});

export type RackFormValues = z.infer<typeof rackFormSchema>;
