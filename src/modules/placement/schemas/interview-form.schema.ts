import { z } from "zod";

export const INTERVIEW_ROUNDS = ["Technical I", "Technical II", "Managerial", "HR Round"] as const;

export const interviewFormSchema = z.object({
  studentId: z.number().int().positive("Choose a student"),
  driveId: z.number().int().positive("Choose a company"),
  interviewDate: z.string().min(1, "Interview date is required"),
  roundLabel: z.string().trim().min(1, "Choose a round"),
  slotLabel: z.string().trim().min(1, "Slot is required").max(100),
  panelMember: z.string().trim().min(1, "Panel member is required").max(150),
});

export type InterviewFormValues = z.infer<typeof interviewFormSchema>;
