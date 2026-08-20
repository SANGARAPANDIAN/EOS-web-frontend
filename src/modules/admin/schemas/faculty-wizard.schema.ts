import { z } from "zod";
import { optionalNumber, optionalText } from "@/modules/admin/schemas/field-helpers";

const tenDigits = (label: string) =>
  optionalText(10).refine((v) => v === undefined || /^\d{10}$/.test(v), `${label}: enter exactly 10 digits.`);

export const facultyWizardSchema = z
  .object({
    // Step 1 — Basic Information
    profilePhotoName: optionalText(255),
    prefix: z.string().min(1, "Title is required"),
    gender: z.string().min(1, "Gender is required"),
    firstName: z.string().trim().min(1, "First name is required").max(100),
    lastName: z.string().trim().min(1, "Last name is required").max(100),
    dob: optionalText(10),

    // Step 2 — Contact Information. `officialEmail` is the only field here
    // still not sendable (no official_email column) — see the create
    // wizard's submit handler.
    personalEmail: z.string().trim().min(1, "Personal email is required").email("Enter a valid email"),
    phone: z.string().trim().regex(/^\d{10}$/, "Enter exactly 10 digits."),
    whatsapp: z.string().trim().regex(/^\d{10}$/, "Enter exactly 10 digits."),
    officialEmail: optionalText(255).refine(
      (v) => v === undefined || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      "Enter a valid email address.",
    ),
    alternatePhone: tenDigits("Alternate phone"),
    addressLine: optionalText(255),
    city: optionalText(100),
    state: optionalText(100),
    pincode: optionalText(6).refine((v) => v === undefined || /^\d{6}$/.test(v), "Enter a 6-digit postal code."),

    // Step 3 — Employment Information.
    designation: z.string().min(1, "Designation is required"),
    departmentId: optionalNumber({ int: true, min: 1 }),
    dateOfJoining: z.string().trim().min(1, "Date of joining is required"),
    employmentStatus: z.string().min(1, "Employment status is required"),
    employeeType: optionalText(50),
    workLocation: optionalText(255),
    confirmationDate: optionalText(10),
    probationEndDate: optionalText(10),

    // Step 4 — Account Information. Not sendable at creation time — the
    // backend's CreateFacultyDto has no status field (only
    // AdminUpdateFacultyDto does, for later edits), so this is UI-only.
    role: z.string().min(1, "Role is required"),
    accountStatus: z.enum(["active", "inactive"]),

    // Step 5 — Identity. Maps to sensitive_info on the real backend.
    aadhar: z.string().trim().regex(/^\d{12}$/, "Enter exactly 12 digits."),
    pan: z.string().trim().regex(/^[A-Za-z]{5}\d{4}[A-Za-z]$/, "Format: ABCDE1234F."),
    bankName: optionalText(255),
    bankAccount: optionalText(20).refine((v) => v === undefined || /^[0-9]{9,20}$/.test(v), "Enter a valid account number."),
    ifsc: optionalText(11).refine(
      (v) => v === undefined || /^[A-Za-z]{4}0[A-Za-z0-9]{6}$/.test(v),
      "Format: 4 letters + 0 + 6 alphanumerics.",
    ),

    // Step 6 — Qualifications.
    qualification: z.string().min(1, "Highest qualification is required"),
    specialization: z.string().trim().min(1, "Specialization is required").max(255),
    previousInstitution: optionalText(255),
    experienceYears: optionalText(3),
  })
  .refine((v) => v.departmentId !== undefined, {
    path: ["departmentId"],
    message: "Choose a department",
  });

export type FacultyWizardValues = z.infer<typeof facultyWizardSchema>;
