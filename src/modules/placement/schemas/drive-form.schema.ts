import { z } from "zod";
import { optionalNumber, optionalText } from "./field-helpers";

// Not a real company id (those are positive autoincrement ids) — the
// "Other (add new company)" sentinel. The drive form swaps in a real id
// before submission, so this must pass validation too.
export const OTHER_COMPANY_ID = -1;

export const driveFormSchema = z
  .object({
    companyId: z.number().refine((v) => v === OTHER_COMPANY_ID || v >= 1, { message: "Choose a company" }),
    scheduledDate: z.string().min(1, "Drive date is required"),
    isDisclosed: z.boolean(),
    disclosedRevealDate: z.string().optional(),
    role: optionalText(150),
    packageLpa: optionalNumber({ min: 0 }),
    eligibilityCgpa: optionalNumber({ min: 0, max: 10 }),
    venue: optionalText(200),
    registrationStart: z.string().optional(),
    registrationEnd: z.string().optional(),
    // Real once query.md #14 runs — accepted but silently dropped by the
    // backend's $queryRaw fallback until then.
    mode: z.enum(["on_campus", "virtual"]).optional(),
    backlogsAllowed: optionalText(50),
    eligibleDepartmentCodes: optionalText(200),
    round1Label: optionalText(100),
    round2Label: optionalText(100),
    round3Label: optionalText(100),
    resultDeclarationNote: optionalText(200),
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
