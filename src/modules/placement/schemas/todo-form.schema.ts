import { z } from "zod";

export const todoFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  deadline: z.string().optional().or(z.literal("")),
  linkUrl: z
    .string()
    .trim()
    .url("Enter a full URL, e.g. https://example.com")
    .max(500)
    .optional()
    .or(z.literal("")),
});

export type TodoFormValues = z.infer<typeof todoFormSchema>;
