import type { Department } from "@/modules/admin/api/refData";
import type { CreateFacultyInput } from "@/modules/admin/api/faculty";
import {
  EMPLOYEE_TYPE_OPTIONS,
  EMPLOYEE_TYPE_TO_ENUM,
  EMPLOYMENT_STATUS_OPTIONS,
  EMPLOYMENT_STATUS_TO_ENUM,
  GENDER_OPTIONS,
  QUALIFICATION_OPTIONS,
  ROLE_OPTIONS,
  TITLE_OPTIONS,
} from "@/modules/admin/lib/faculty-wizard-config";

export interface ImportFieldDef {
  key: string;
  label: string;
  required?: boolean;
  hint?: string;
}

// Order doubles as the column order in the downloadable template.
export const IMPORT_FIELDS: ImportFieldDef[] = [
  { key: "first_name", label: "First name", required: true },
  { key: "last_name", label: "Last name", required: true },
  { key: "email", label: "Personal email", required: true, hint: "Becomes their login" },
  { key: "designation", label: "Designation", required: true },
  { key: "department", label: "Department", required: true, hint: "Name or code, e.g. CS" },
  { key: "phone", label: "Phone", hint: "10 digits" },
  { key: "date_of_joining", label: "Date of joining", hint: "YYYY-MM-DD" },
  { key: "prefix", label: "Title", hint: TITLE_OPTIONS.join(" / ") },
  { key: "gender", label: "Gender", hint: GENDER_OPTIONS.join(" / ") },
  { key: "date_of_birth", label: "Date of birth", hint: "YYYY-MM-DD" },
  { key: "whatsapp_number", label: "WhatsApp number", hint: "10 digits" },
  { key: "alternate_phone", label: "Alternate phone", hint: "10 digits" },
  { key: "address_line", label: "Address" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "postal_code", label: "Postal code", hint: "6 digits" },
  { key: "academic_role", label: "Role", hint: ROLE_OPTIONS.join(" / ") },
  { key: "employment_status", label: "Employment status", hint: EMPLOYMENT_STATUS_OPTIONS.join(" / ") },
  { key: "employment_type", label: "Employment type", hint: EMPLOYEE_TYPE_OPTIONS.join(" / ") },
  { key: "work_location", label: "Work location" },
  { key: "qualification", label: "Qualification", hint: QUALIFICATION_OPTIONS.join(" / ") },
  { key: "specialization", label: "Specialization" },
  { key: "previous_institution", label: "Previous institution" },
  { key: "previous_experience_years", label: "Previous experience (years)" },
  { key: "office_room", label: "Office room" },
  { key: "aadhar_number", label: "Aadhar number", hint: "12 digits" },
  { key: "pan_number", label: "PAN number", hint: "ABCDE1234F" },
  { key: "bank_name", label: "Bank name" },
  { key: "bank_account_number", label: "Bank account number" },
  { key: "bank_ifsc", label: "Bank IFSC", hint: "SBIN0001234" },
];

export const IMPORT_MAX_ROWS = 5000;

export type ImportRow = Record<string, string>;

// ---- Delimited-text parsing (CSV or TSV, quoted fields, embedded newlines) ----

function detectDelimiter(text: string): "," | "\t" {
  const firstLine = text.slice(0, text.indexOf("\n") === -1 ? text.length : text.indexOf("\n"));
  return firstLine.includes("\t") ? "\t" : ",";
}

export function parseDelimitedText(text: string): string[][] {
  const clean = text.replace(/^﻿/, "").replace(/\r\n/g, "\n");
  const delimiter = detectDelimiter(clean);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    if (inQuotes) {
      if (char === '"') {
        if (clean[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

export interface ParsedSheet {
  headers: string[];
  rows: string[][];
}

export function parseSheet(text: string): ParsedSheet {
  const all = parseDelimitedText(text);
  const [headers = [], ...rows] = all;
  return { headers: headers.map((h) => h.trim()), rows };
}

// ---- Auto-mapping: match a source header to one of IMPORT_FIELDS by label/key ----

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function autoMapColumns(headers: string[]): Record<number, string> {
  const mapping: Record<number, string> = {};
  headers.forEach((header, index) => {
    const normalized = normalize(header);
    const match = IMPORT_FIELDS.find((f) => normalize(f.label) === normalized || normalize(f.key) === normalized);
    if (match) mapping[index] = match.key;
  });
  return mapping;
}

// ---- Template + sample data ----

export function buildTemplateCsv(): string {
  return IMPORT_FIELDS.map((f) => f.label).join(",") + "\n";
}

export function buildSampleCsv(): string {
  const header = IMPORT_FIELDS.map((f) => f.label).join(",");
  const sampleRows = [
    [
      "Ananya",
      "Rao",
      "ananya.rao.sample@gmail.com",
      "Assistant Professor",
      "CS",
      "9876543210",
      "2026-06-01",
      "Dr.",
      "Female",
      "1990-03-15",
      "",
      "",
      "",
      "",
      "",
      "",
      "Faculty",
      "Confirmed",
      "Full-time",
      "",
      "Ph.D.",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ],
    [
      "Vikram",
      "Iyer",
      "vikram.iyer.sample@gmail.com",
      "Associate Professor",
      "CS",
      "9876500000",
      "2026-06-01",
      "Mr.",
      "Male",
      "1985-11-20",
      "",
      "",
      "",
      "",
      "",
      "",
      "Faculty",
      "Confirmed",
      "Full-time",
      "",
      "M.E. / M.Tech",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ],
  ];
  return [header, ...sampleRows.map((r) => r.join(","))].join("\n") + "\n";
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadTemplate() {
  downloadCsv(buildTemplateCsv(), "faculty-import-template.csv");
}

export function downloadSample() {
  downloadCsv(buildSampleCsv(), "faculty-import-sample.csv");
}

// ---- Row validation + payload building ----

export interface RowValidationResult {
  payload: CreateFacultyInput | null;
  errors: Record<string, string>;
}

const DIGITS_10 = /^\d{10}$/;
const DIGITS_6 = /^\d{6}$/;
const DIGITS_12 = /^\d{12}$/;
const DATE_ISO = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PAN_RE = /^[A-Za-z]{5}\d{4}[A-Za-z]$/;
const IFSC_RE = /^[A-Za-z]{4}0[A-Za-z0-9]{6}$/;

function findDepartment(value: string, departments: Department[]): Department | undefined {
  const needle = value.trim().toLowerCase();
  return departments.find((d) => d.name.toLowerCase() === needle || d.code.toLowerCase() === needle);
}

function matchOption(value: string, options: string[]): string | undefined {
  const needle = value.trim().toLowerCase();
  return options.find((o) => o.toLowerCase() === needle);
}

export function validateRow(row: ImportRow, departments: Department[]): RowValidationResult {
  const errors: Record<string, string> = {};
  const get = (key: string) => (row[key] ?? "").trim();

  const firstName = get("first_name");
  if (!firstName) errors.first_name = "Required";

  const lastName = get("last_name");
  if (!lastName) errors.last_name = "Required";

  const email = get("email");
  if (!email) errors.email = "Required";
  else if (!EMAIL_RE.test(email)) errors.email = "Invalid email";

  const designation = get("designation");
  if (!designation) errors.designation = "Required";

  const departmentRaw = get("department");
  let department: Department | undefined;
  if (!departmentRaw) errors.department = "Required";
  else {
    department = findDepartment(departmentRaw, departments);
    if (!department) errors.department = `Unknown department "${departmentRaw}"`;
  }

  const phone = get("phone");
  if (phone && !DIGITS_10.test(phone)) errors.phone = "Must be 10 digits";

  const dateOfJoining = get("date_of_joining");
  if (dateOfJoining && !DATE_ISO.test(dateOfJoining)) errors.date_of_joining = "Use YYYY-MM-DD";

  const prefix = get("prefix");
  let matchedPrefix: string | undefined;
  if (prefix) {
    matchedPrefix = matchOption(prefix, TITLE_OPTIONS);
    if (!matchedPrefix) errors.prefix = `Must be one of: ${TITLE_OPTIONS.join(", ")}`;
  }

  const gender = get("gender");
  let matchedGender: string | undefined;
  if (gender) {
    matchedGender = matchOption(gender, GENDER_OPTIONS);
    if (!matchedGender) errors.gender = `Must be one of: ${GENDER_OPTIONS.join(", ")}`;
  }

  const dateOfBirth = get("date_of_birth");
  if (dateOfBirth && !DATE_ISO.test(dateOfBirth)) errors.date_of_birth = "Use YYYY-MM-DD";

  const whatsapp = get("whatsapp_number");
  if (whatsapp && !DIGITS_10.test(whatsapp)) errors.whatsapp_number = "Must be 10 digits";

  const altPhone = get("alternate_phone");
  if (altPhone && !DIGITS_10.test(altPhone)) errors.alternate_phone = "Must be 10 digits";

  const postalCode = get("postal_code");
  if (postalCode && !DIGITS_6.test(postalCode)) errors.postal_code = "Must be 6 digits";

  const academicRole = get("academic_role");
  let matchedRole: string | undefined;
  if (academicRole) {
    matchedRole = matchOption(academicRole, ROLE_OPTIONS);
    if (!matchedRole) errors.academic_role = `Must be one of: ${ROLE_OPTIONS.join(", ")}`;
  }

  const employmentStatus = get("employment_status");
  let matchedEmploymentStatus: string | undefined;
  if (employmentStatus) {
    matchedEmploymentStatus = matchOption(employmentStatus, EMPLOYMENT_STATUS_OPTIONS);
    if (!matchedEmploymentStatus) errors.employment_status = `Must be one of: ${EMPLOYMENT_STATUS_OPTIONS.join(", ")}`;
  }

  const employmentType = get("employment_type");
  let matchedEmploymentType: string | undefined;
  if (employmentType) {
    matchedEmploymentType = matchOption(employmentType, EMPLOYEE_TYPE_OPTIONS);
    if (!matchedEmploymentType) errors.employment_type = `Must be one of: ${EMPLOYEE_TYPE_OPTIONS.join(", ")}`;
  }

  const qualification = get("qualification");
  let matchedQualification: string | undefined;
  if (qualification) {
    matchedQualification = matchOption(qualification, QUALIFICATION_OPTIONS);
    if (!matchedQualification) errors.qualification = `Must be one of: ${QUALIFICATION_OPTIONS.join(", ")}`;
  }

  const previousExperienceYearsRaw = get("previous_experience_years");
  let previousExperienceYears: number | undefined;
  if (previousExperienceYearsRaw) {
    const n = Number(previousExperienceYearsRaw);
    if (!Number.isInteger(n) || n < 0 || n > 60) errors.previous_experience_years = "Enter a whole number, 0-60";
    else previousExperienceYears = n;
  }

  const aadhar = get("aadhar_number");
  if (aadhar && !DIGITS_12.test(aadhar)) errors.aadhar_number = "Must be 12 digits";

  const pan = get("pan_number");
  if (pan && !PAN_RE.test(pan)) errors.pan_number = "Format: ABCDE1234F";

  const ifsc = get("bank_ifsc");
  if (ifsc && !IFSC_RE.test(ifsc)) errors.bank_ifsc = "Format: SBIN0001234";

  if (Object.keys(errors).length > 0 || !department) {
    return { payload: null, errors };
  }

  const hasSensitiveInfo = aadhar || pan || get("bank_name") || get("bank_account_number") || ifsc;

  const payload: CreateFacultyInput = {
    email,
    first_name: firstName,
    last_name: lastName,
    designation,
    department_id: department.id,
    phone: phone || undefined,
    date_of_joining: dateOfJoining || undefined,
    prefix: matchedPrefix,
    gender: matchedGender,
    date_of_birth: dateOfBirth || undefined,
    whatsapp_number: whatsapp || undefined,
    alternate_phone: altPhone || undefined,
    address_line: get("address_line") || undefined,
    city: get("city") || undefined,
    state: get("state") || undefined,
    postal_code: postalCode || undefined,
    academic_role: matchedRole,
    employment_status: matchedEmploymentStatus ? EMPLOYMENT_STATUS_TO_ENUM[matchedEmploymentStatus] : undefined,
    employment_type: matchedEmploymentType ? EMPLOYEE_TYPE_TO_ENUM[matchedEmploymentType] : undefined,
    work_location: get("work_location") || undefined,
    qualification: matchedQualification,
    specialization: get("specialization") || undefined,
    previous_institution: get("previous_institution") || undefined,
    previous_experience_years: previousExperienceYears,
    office_room: get("office_room") || undefined,
    sensitive_info: hasSensitiveInfo
      ? {
          aadhar_number: aadhar || undefined,
          pan_number: pan ? pan.toUpperCase() : undefined,
          bank_name: get("bank_name") || undefined,
          bank_account_number: get("bank_account_number") || undefined,
          bank_ifsc: ifsc ? ifsc.toUpperCase() : undefined,
        }
      : undefined,
  };

  return { payload, errors: {} };
}
