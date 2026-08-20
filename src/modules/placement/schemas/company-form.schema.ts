import { z } from "zod";
import { COMPANY_INDUSTRIES } from "@/modules/placement/api/companies";
import { optionalNumber, optionalText } from "./field-helpers";

export const companyFormSchema = z.object({
  name: z.string().trim().min(1, "Company name is required").max(200),
  industry: z.enum(COMPANY_INDUSTRIES).optional(),
  location: optionalText(120),
  recruiterSpoc: optionalText(150),
  expectedPackageLpa: optionalNumber({ min: 0 }),
  profileInfo: optionalText(2000),
});

export type CompanyFormValues = z.infer<typeof companyFormSchema>;
