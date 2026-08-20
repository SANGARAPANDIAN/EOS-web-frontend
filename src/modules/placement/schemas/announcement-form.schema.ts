import { z } from "zod";
import { ANNOUNCEMENT_CATEGORIES } from "@/modules/placement/api/announcements";

export const announcementFormSchema = z.object({
  title: z.string().trim().min(1, "Headline is required").max(150),
  content: z.string().trim().min(1, "Message is required"),
  targetAudience: z.enum(["students", "teachers", "parents"]),
  // The composer's "No category" option submits "" through the native
  // <select>, not undefined — accepted here and normalized to undefined
  // before the request is built.
  category: z.union([z.enum(ANNOUNCEMENT_CATEGORIES), z.literal("")]).optional(),
  status: z.enum(["draft", "published"]),
});

export type AnnouncementFormValues = z.infer<typeof announcementFormSchema>;
