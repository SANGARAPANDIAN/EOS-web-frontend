import type { Course, Batch, Quota } from "@/modules/admin/api/refData";
import type { BulkImportStudentRow } from "@/modules/admin/api/studentImport";
import {
  IMPORT_MAX_ROWS,
  autoMapColumns as autoMapColumnsGeneric,
  buildSampleCsv as buildSampleCsvGeneric,
  buildTemplateCsv as buildTemplateCsvGeneric,
  downloadImportCsv,
  parseDelimitedText,
  parseSheet,
  type ImportFieldDef,
  type ImportRow,
  type ParsedSheet,
} from "@/lib/utils/importSheet";

export type { ImportFieldDef, ImportRow, ParsedSheet };
export { IMPORT_MAX_ROWS, parseDelimitedText, parseSheet };

const STUDENT_TYPE_OPTIONS = ["hosteller", "dayscholar"];
const DAYSCHOLAR_MODE_OPTIONS = ["transport", "own_vehicle"];

// Order doubles as the column order in the downloadable template. Matches
// BulkImportStudentRowDto (backend) exactly — course/quota/batch are given
// as human-readable code/name here, resolved server-side, since real
// counselling-authority data never has this app's internal ids.
export const IMPORT_FIELDS: ImportFieldDef[] = [
  { key: "first_name", label: "First name", required: true },
  { key: "last_name", label: "Last name" },
  { key: "email", label: "Email", required: true, hint: "Becomes their login" },
  { key: "student_id_no", label: "Student ID No.", required: true },
  { key: "roll_no", label: "Roll no." },
  { key: "register_no", label: "Register no." },
  { key: "course_code", label: "Course code", required: true, hint: "e.g. CSE" },
  { key: "quota_name", label: "Quota", required: true },
  { key: "batch_name", label: "Batch", required: true, hint: "e.g. 2026-2030" },
  { key: "student_type", label: "Student type", required: true, hint: STUDENT_TYPE_OPTIONS.join(" / ") },
  { key: "dayscholar_mode", label: "Dayscholar mode", hint: DAYSCHOLAR_MODE_OPTIONS.join(" / ") },
  { key: "vehicle_number", label: "Vehicle number" },
  { key: "gender", label: "Gender" },
  { key: "date_of_birth", label: "Date of birth", hint: "YYYY-MM-DD" },
];

export function autoMapColumns(headers: string[]): Record<number, string> {
  return autoMapColumnsGeneric(headers, IMPORT_FIELDS);
}

export function buildTemplateCsv(): string {
  return buildTemplateCsvGeneric(IMPORT_FIELDS);
}

export function buildSampleCsv(): string {
  const sampleRows = [
    ["Ananya", "Rao", "ananya.rao.sample@gmail.com", "26CS101", "1", "26CS101", "CSE", "Government", "2026-2030", "dayscholar", "own_vehicle", "TN01AB1234", "Female", "2008-03-15"],
    ["Vikram", "Iyer", "vikram.iyer.sample@gmail.com", "26CS102", "2", "26CS102", "CSE", "Management", "2026-2030", "hosteller", "", "", "Male", "2008-06-20"],
  ];
  return buildSampleCsvGeneric(IMPORT_FIELDS, sampleRows);
}

export function downloadTemplate() {
  downloadImportCsv(buildTemplateCsv(), "student-import-template.csv");
}

export function downloadSample() {
  downloadImportCsv(buildSampleCsv(), "student-import-sample.csv");
}

// ---- Row validation + payload building ----

export interface RowValidationResult {
  payload: BulkImportStudentRow | null;
  errors: Record<string, string>;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_ISO = /^\d{4}-\d{2}-\d{2}$/;

function findByCode(value: string, courses: Course[]): Course | undefined {
  const needle = value.trim().toLowerCase();
  return courses.find((c) => c.code.toLowerCase() === needle);
}

function findByName<T extends { name: string }>(value: string, items: T[]): T | undefined {
  const needle = value.trim().toLowerCase();
  return items.find((i) => i.name.toLowerCase() === needle);
}

function matchOption(value: string, options: string[]): string | undefined {
  const needle = value.trim().toLowerCase();
  return options.find((o) => o.toLowerCase() === needle);
}

export function validateRow(
  row: ImportRow,
  refData: { courses: Course[]; quotas: Quota[]; batches: Batch[] },
): RowValidationResult {
  const errors: Record<string, string> = {};
  const get = (key: string) => (row[key] ?? "").trim();

  const firstName = get("first_name");
  if (!firstName) errors.first_name = "Required";

  const email = get("email");
  if (!email) errors.email = "Required";
  else if (!EMAIL_RE.test(email)) errors.email = "Invalid email";

  const studentIdNo = get("student_id_no");
  if (!studentIdNo) errors.student_id_no = "Required";

  const courseCode = get("course_code");
  if (!courseCode) errors.course_code = "Required";
  else if (!findByCode(courseCode, refData.courses)) errors.course_code = `Unknown course code "${courseCode}"`;

  const quotaName = get("quota_name");
  if (!quotaName) errors.quota_name = "Required";
  else if (!findByName(quotaName, refData.quotas)) errors.quota_name = `Unknown quota "${quotaName}"`;

  const batchName = get("batch_name");
  if (!batchName) errors.batch_name = "Required";
  else if (!findByName(batchName, refData.batches)) errors.batch_name = `Unknown batch "${batchName}"`;

  const studentTypeRaw = get("student_type");
  let studentType: string | undefined;
  if (!studentTypeRaw) errors.student_type = "Required";
  else {
    studentType = matchOption(studentTypeRaw, STUDENT_TYPE_OPTIONS);
    if (!studentType) errors.student_type = `Must be one of: ${STUDENT_TYPE_OPTIONS.join(", ")}`;
  }

  const dayscholarModeRaw = get("dayscholar_mode");
  let dayscholarMode: string | undefined;
  if (dayscholarModeRaw) {
    dayscholarMode = matchOption(dayscholarModeRaw, DAYSCHOLAR_MODE_OPTIONS);
    if (!dayscholarMode) errors.dayscholar_mode = `Must be one of: ${DAYSCHOLAR_MODE_OPTIONS.join(", ")}`;
  }
  if (studentType === "dayscholar" && !dayscholarMode) {
    errors.dayscholar_mode = "Required for dayscholar students";
  }

  const vehicleNumber = get("vehicle_number");
  if (dayscholarMode === "own_vehicle" && !vehicleNumber) {
    errors.vehicle_number = "Required when dayscholar mode is own_vehicle";
  }

  const dateOfBirth = get("date_of_birth");
  if (dateOfBirth && !DATE_ISO.test(dateOfBirth)) errors.date_of_birth = "Use YYYY-MM-DD";

  if (Object.keys(errors).length > 0) {
    return { payload: null, errors };
  }

  const payload: BulkImportStudentRow = {
    first_name: firstName,
    last_name: get("last_name") || undefined,
    email,
    student_id_no: studentIdNo,
    roll_no: get("roll_no") || undefined,
    register_no: get("register_no") || undefined,
    course_code: courseCode,
    quota_name: quotaName,
    batch_name: batchName,
    student_type: studentType as "hosteller" | "dayscholar",
    dayscholar_mode: dayscholarMode as "transport" | "own_vehicle" | undefined,
    vehicle_number: vehicleNumber || undefined,
    gender: get("gender") || undefined,
    date_of_birth: dateOfBirth || undefined,
  };

  return { payload, errors: {} };
}
