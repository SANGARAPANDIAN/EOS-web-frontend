import { z } from "zod";
import { optionalText } from "./field-helpers";

export const recordResultFormSchema = z.object({
  result: z.enum(["applied", "r1_cleared", "r2_cleared", "r3_cleared", "placed", "rejected"]),
  panelFeedback: optionalText(500),
});

export type RecordResultFormValues = z.infer<typeof recordResultFormSchema>;
