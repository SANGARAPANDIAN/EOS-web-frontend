import { z } from "zod";

export const categoryFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(150),
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;
