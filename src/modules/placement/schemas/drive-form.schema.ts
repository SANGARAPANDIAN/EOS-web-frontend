import { z } from "zod";

// Not a real company id (those are positive autoincrement ids) — the
// "Other (add new company)" sentinel. ScheduleDriveForm swaps in a real id
// before submission, so this must pass validation too.
export const OTHER_COMPANY_ID = -1;

export const driveFormSchema = z
  .object({
    companyId: z.number().refine((v) => v === OTHER_COMPANY_ID || v >= 1, { message: "Choose a company" }),
    scheduledDate: z.string().min(1, "Drive date is required"),
    isDisclosed: z.boolean(),
    disclosedRevealDate: z.string().optional(),
    role: z.string().trim().max(150).optional(),
    packageLpa: z.number().min(0, "Package must be 0 or more").optional(),
    eligibilityCgpa: z.number().min(0).max(10).optional(),
    venue: z.string().trim().max(200).optional(),
    registrationStart: z.string().optional(),
    registrationEnd: z.string().optional(),
    // Real once query.md #14 runs — accepted but silently dropped by the
    // backend's $queryRaw fallback until then.
    mode: z.enum(["on_campus", "virtual"]).optional(),
    backlogsAllowed: z.string().trim().max(50).optional(),
    eligibleDepartmentCodes: z.string().trim().max(200).optional(),
    round1Label: z.string().trim().max(100).optional(),
    round2Label: z.string().trim().max(100).optional(),
    round3Label: z.string().trim().max(100).optional(),
    resultDeclarationNote: z.string().trim().max(200).optional(),
  })
  .refine((v) => v.isDisclosed || !!v.disclosedRevealDate, {
    path: ["disclosedRevealDate"],
    message: "Reveal date is required when the company is undisclosed",
  })
  .refine((v) => !v.registrationStart || !v.registrationEnd || v.registrationStart <= v.registrationEnd, {
    path: ["registrationEnd"],
    message: "Registration end must be on or after the start date",
  });

export type DriveFormValues = z.infer<typeof driveFormSchema>;
