import { z } from "zod";
import { optionalNumber, optionalText } from "@/modules/admin/schemas/field-helpers";

const tenDigits = (label: string) =>
  optionalText(10).refine((v) => v === undefined || /^\d{10}$/.test(v), `${label}: enter exactly 10 digits.`);

// Full-page Edit Faculty form (admin operation on an existing record). Almost
// every field here maps to AdminUpdateFacultyDto — the only exceptions are
// `profilePhotoName` (no storage wired up yet) and `reportingTo` (that column
// is an integer faculty_id FK, not a free-text name; wiring it needs a
// searchable faculty picker, not a text input). None of the fields are
// marked `required` here — Save shouldn't block on optional profile detail.
export const facultyEditSchema = z
  .object({
    // ---- Basic Information ----
    profilePhotoName: optionalText(255),
    prefix: optionalText(20),
    gender: optionalText(20),
    first_name: z.string().trim().min(1, "First name is required").max(100),
    last_name: z.string().trim().min(1, "Last name is required").max(100),
    dob: optionalText(10),
    designation: z.string().trim().min(1, "Designation is required").max(100),
    department_id: optionalNumber({ int: true, min: 1 }),
    date_of_joining: optionalText(10),

    // ---- Contact Information ----
    personalEmail: optionalText(255).refine(
      (v) => v === undefined || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      "Enter a valid email address.",
    ),
    phone: optionalText(20).refine((v) => v === undefined || /^[0-9+\-\s()]{7,20}$/.test(v), "Enter a valid phone number"),
    alternatePhone: tenDigits("Alternate phone"),
    addressLine: optionalText(255),
    city: optionalText(100),
    state: optionalText(100),
    pincode: optionalText(6).refine((v) => v === undefined || /^\d{6}$/.test(v), "Enter a 6-digit postal code."),

    // ---- Account Information ----
    role: optionalText(50),
    status: z.enum(["active", "inactive"]).optional(),

    // ---- Employment ----
    employmentStatus: optionalText(50),
    employeeType: optionalText(50),
    confirmationDate: optionalText(10),
    probationEndDate: optionalText(10),
    workLocation: optionalText(255),
    qualification: optionalText(100),
    specialization: optionalText(255),
    officeRoom: optionalText(100),
    reportingTo: optionalText(150), // UI-only — see file header comment.

    // ---- Identity ---- (maps to sensitive_info; not required since
    // GET /me/faculty/:id never returns sensitive_info back, so there's no
    // way to tell whether a record already has one on file)
    aadhar_number: optionalText(12).refine((v) => v === undefined || /^\d{12}$/.test(v), "Must be exactly 12 digits"),
    pan_number: optionalText(10).refine(
      (v) => v === undefined || /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v),
      "Invalid PAN format (e.g. ABCDE1234F)",
    ),
    bank_account_number: optionalText(20).refine((v) => v === undefined || /^[0-9]{9,20}$/.test(v), "Enter a valid account number"),
    bank_ifsc: optionalText(11).refine((v) => v === undefined || /^[A-Z]{4}0[A-Z0-9]{6}$/.test(v), "Invalid IFSC format"),
    bank_name: optionalText(255),
  })
  .refine((v) => v.department_id !== undefined, {
    path: ["department_id"],
    message: "Choose a department",
  });

export type FacultyEditValues = z.infer<typeof facultyEditSchema>;
