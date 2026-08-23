import { z } from "zod";
import { COMPANY_INDUSTRIES } from "../types";

export const companyFormSchema = z.object({
  name: z.string().trim().min(1, "Company name is required").max(200),
  industry: z.enum(COMPANY_INDUSTRIES).optional(),
  location: z.string().trim().max(120).optional(),
  recruiterSpoc: z.string().trim().max(150).optional(),
  expectedPackageLpa: z.number().min(0).optional(),
  profileInfo: z.string().trim().max(2000).optional(),
});

export type CompanyFormValues = z.infer<typeof companyFormSchema>;
