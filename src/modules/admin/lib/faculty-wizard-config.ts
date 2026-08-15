import type { FacultyWizardValues } from "@/modules/admin/schemas/faculty-wizard.schema";

export interface WizardStep {
  id: string;
  label: string;
}

export const WIZARD_STEPS: WizardStep[] = [
  { id: "basic", label: "Basic Information" },
  { id: "contact", label: "Contact Information" },
  { id: "employment", label: "Employment Information" },
  { id: "account", label: "Account Information" },
  { id: "identity", label: "Identity" },
  { id: "qualifications", label: "Qualifications" },
  { id: "documents", label: "Documents" },
  { id: "review", label: "Review" },
];

// Field lists per step — used both to know what to validate before
// advancing ("Next" only checks the current step) and to compute the live
// "N of M filled" progress subtext.
export const STEP_FIELDS: Record<string, (keyof FacultyWizardValues)[]> = {
  basic: ["profilePhotoName", "prefix", "gender", "firstName", "lastName", "dob"],
  contact: ["personalEmail", "phone", "whatsapp", "officialEmail", "alternatePhone", "addressLine", "city", "state", "pincode"],
  employment: ["designation", "departmentId", "dateOfJoining", "employmentStatus", "employeeType", "workLocation", "confirmationDate", "probationEndDate"],
  account: ["role", "accountStatus"],
  identity: ["aadhar", "pan", "bankName", "bankAccount", "ifsc"],
  qualifications: ["qualification", "specialization", "previousInstitution", "experienceYears"],
  documents: [],
  review: [],
};

// Only these are true backend requirements (validated on every step, not
// just when its own step is active, since final submit checks everything).
export const REQUIRED_FIELDS: (keyof FacultyWizardValues)[] = [
  "prefix",
  "gender",
  "firstName",
  "lastName",
  "personalEmail",
  "phone",
  "whatsapp",
  "designation",
  "departmentId",
  "dateOfJoining",
  "employmentStatus",
  "role",
  "accountStatus",
  "aadhar",
  "pan",
  "qualification",
  "specialization",
];

export const DESIGNATION_OPTIONS = ["Professor & Head", "Professor", "Associate Professor", "Assistant Professor"];
export const TITLE_OPTIONS = ["Dr.", "Mr.", "Ms.", "Mrs.", "Prof."];
export const GENDER_OPTIONS = ["Male", "Female", "Other"];
export const EMPLOYMENT_STATUS_OPTIONS = ["Probation", "Confirmed", "On Leave", "Resigned", "Retired"];
export const EMPLOYEE_TYPE_OPTIONS = ["Full-time", "Part-time", "Visiting", "Adjunct"];
export const ROLE_OPTIONS = ["HOD", "Faculty", "Class Advisor", "Coordinator"];
export const QUALIFICATION_OPTIONS = ["B.E. / B.Tech", "M.E. / M.Tech", "Ph.D.", "M.Sc.", "M.Phil.", "Other"];
export const DOCUMENT_TYPE_OPTIONS = [
  "Resume / CV",
  "Aadhar Copy",
  "PAN Copy",
  "Educational Certificate",
  "Experience Certificate",
  "Appointment / Joining Letter",
  "Other",
];
export const QUALIFICATION_DOCUMENT_TYPE_OPTIONS = [
  "Educational Certificate",
  "UG Degree Certificate",
  "PG Degree Certificate",
  "Ph.D. Certificate",
  "Experience Certificate",
  "Relieving Letter",
  "SSLC / HSC Marksheet",
  "Other Qualification Document",
];

// Backend's employment_status/employment_type columns are Postgres enums
// (snake_case), while the UI shows human-readable labels — these map
// between the two. Keep in sync with EMPLOYMENT_STATUS_OPTIONS/
// EMPLOYEE_TYPE_OPTIONS above and the enum values in the backend schema.
export const EMPLOYMENT_STATUS_TO_ENUM: Record<string, string> = {
  Probation: "probation",
  Confirmed: "confirmed",
  "On Leave": "on_leave",
  Resigned: "resigned",
  Retired: "retired",
};

export const EMPLOYMENT_STATUS_FROM_ENUM: Record<string, string> = Object.fromEntries(
  Object.entries(EMPLOYMENT_STATUS_TO_ENUM).map(([label, value]) => [value, label]),
);

export const EMPLOYEE_TYPE_TO_ENUM: Record<string, string> = {
  "Full-time": "full_time",
  "Part-time": "part_time",
  Visiting: "visiting",
  Adjunct: "adjunct",
};

export const EMPLOYEE_TYPE_FROM_ENUM: Record<string, string> = Object.fromEntries(
  Object.entries(EMPLOYEE_TYPE_TO_ENUM).map(([label, value]) => [value, label]),
);

export function isFieldFilled(value: unknown): boolean {
  if (typeof value === "string") return value.trim() !== "";
  return value !== undefined && value !== null;
}

export function getStepProgress(stepId: string, values: Partial<FacultyWizardValues>): { filled: number; total: number } {
  const fields = STEP_FIELDS[stepId] ?? [];
  const filled = fields.filter((name) => isFieldFilled(values[name])).length;
  return { filled, total: fields.length };
}
