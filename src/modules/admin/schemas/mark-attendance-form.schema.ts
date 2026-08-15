import { z } from "zod";

export const markAttendanceFormSchema = z.object({
  date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  status: z.enum(["full_day", "half_day", "absent", "on_duty", "on_leave", "weekly_off", "holiday"]),
  punch_in: z.string().trim().optional(),
  punch_out: z.string().trim().optional(),
});

export type MarkAttendanceFormValues = z.infer<typeof markAttendanceFormSchema>;
