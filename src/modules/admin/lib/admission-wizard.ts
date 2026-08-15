/**
 * Pure logic for the admission-completion wizard — key-building, showWhen
 * evaluation, validation, per-category stats, and the final perfect-entry
 * payload builder. Ported 1:1 from the old repo's
 * modules/admissions/wizard/shared.tsx (minus its JSX, which lives under
 * src/modules/admin/components/admission-wizard/, and minus friendlyError,
 * which already exists at src/lib/utils/errors.ts).
 */
import type { Category, FieldGroup, FieldSpec } from "@/modules/admin/config/admissionWizardSections";
import type { CreatePerfectEntryInput } from "@/modules/admin/api/admissions";

export const vkey = (categoryId: string, fieldKey: string) => `${categoryId}.${fieldKey}`;

export function parseShowWhen(expr: string): [string, string | undefined] {
  const [key, expected] = expr.split("=");
  return [key, expected];
}

/**
 * A showWhen target field's own defaultValue counts as its current value
 * until the admin actually touches it — e.g. a bool field defaulting to
 * "false" must resolve as "false" here even though `values` has no entry
 * for it yet (an untouched checkbox is stored nowhere, not as "false").
 * Without this, a field gated on `showWhen: "otherKey=false"` would stay
 * hidden until the admin toggled otherKey on and back off once.
 */
function resolveShowWhenValue(category: Category, key: string, values: Record<string, string>): string {
  const stored = values[vkey(category.id, key)];
  if (stored !== undefined) return stored;
  for (const group of category.groups ?? []) {
    const field = group.fields.find((f) => f.key === key);
    if (field?.defaultValue !== undefined) return field.defaultValue;
  }
  return "";
}

export function isFieldVisible(category: Category, field: FieldSpec, values: Record<string, string>): boolean {
  if (!field.showWhen) return true;
  const [key, expected] = parseShowWhen(field.showWhen);
  const current = resolveShowWhenValue(category, key, values);
  return expected !== undefined ? current === expected : !!current && current !== "false";
}

export function isGroupVisible(category: Category, group: FieldGroup, values: Record<string, string>): boolean {
  if (!group.showWhen) return true;
  const [key, expected] = parseShowWhen(group.showWhen);
  const current = resolveShowWhenValue(category, key, values);
  return expected !== undefined ? current === expected : !!current && current !== "false";
}

/** Every field a save would actually look at — honours group- and field-level showWhen, skips disabled/readonly. */
export function liveFields(category: Category, values: Record<string, string>): FieldSpec[] {
  const out: FieldSpec[] = [];
  (category.groups ?? []).forEach((group) => {
    if (!isGroupVisible(category, group, values)) return;
    group.fields.forEach((field) => {
      if (field.type === "disabled" || field.type === "readonly") return;
      if (!isFieldVisible(category, field, values)) return;
      out.push(field);
    });
  });
  return out;
}

const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;
const AADHAAR_RE = /^\d{4}-?\d{4}-?\d{4}$/;
const PAN_RE = /^[A-Za-z]{5}\d{4}[A-Za-z]$/;

export function validateField(field: FieldSpec, raw: string): string | null {
  const value = raw.trim();
  if (!value) return field.required ? `${field.label} is required.` : null;
  if (field.max && (field.type === "text" || field.type === "textarea" || field.type === "password") && value.length > field.max) {
    return `${value.length} characters — max is ${field.max}.`;
  }
  if (field.key === "aadhar_number") return AADHAAR_RE.test(value) ? null : "12 digits, optionally grouped with dashes.";
  if (field.key === "pan_number") return PAN_RE.test(value.toUpperCase()) ? null : "Five letters, four digits, one letter.";
  if (field.key === "perm_pincode" || field.key === "temp_pincode") {
    return /^\d{6}$/.test(value) ? null : "Exactly 6 digits.";
  }
  if (field.key === "joined_academic_year") {
    return /^\d{4}-\d{4}$/.test(value) ? null : "Format: YYYY-YYYY, e.g. 2026-2027.";
  }
  if (field.key === "password") {
    return value.length >= 6 ? null : "At least 6 characters — the backend rejects anything shorter.";
  }
  switch (field.type) {
    case "email":
      return EMAIL_RE.test(value) ? null : "Not a valid email address.";
    case "tel":
      return /^\d{10}$/.test(value) ? null : "Exactly 10 digits.";
    case "date":
      return Number.isNaN(Date.parse(value)) ? "Unreadable date." : null;
    case "decimal": {
      if (!/^\d+(\.\d{1,2})?$/.test(value)) return "A number with up to two decimal places.";
      return Number(value) > 100 ? "Cannot exceed 100." : null;
    }
    case "money":
      return /^\d+(\.\d{1,2})?$/.test(value.replace(/[₹,\s]/g, "")) ? null : "Not an amount.";
    case "lookup":
      return field.required && !value ? `${field.label} is required.` : null;
    default:
      return null;
  }
}

export interface CategoryStats {
  total: number;
  filled: number;
  missingRequired: FieldSpec[];
}

export function categoryStats(
  category: Category,
  values: Record<string, string>,
  marks: string[],
  certificateTypeIds: number[] = [],
): CategoryStats {
  if (category.review) return { total: 0, filled: 0, missingRequired: [] };
  if (category.repeat) {
    const filled = marks.filter((m) => m.trim()).length;
    return { total: marks.length, filled, missingRequired: [] };
  }
  if (category.disabledStub) return { total: 0, filled: 0, missingRequired: [] };
  if (category.checklist) {
    const filled = certificateTypeIds.filter(
      (id) => values[vkey(category.id, `${id}_available`)] === "true",
    ).length;
    return { total: certificateTypeIds.length, filled, missingRequired: [] };
  }
  const fields = liveFields(category, values);
  const missingRequired: FieldSpec[] = [];
  let filled = 0;
  fields.forEach((f) => {
    const v = (values[vkey(category.id, f.key)] ?? f.defaultValue ?? "").trim();
    if (v && v !== "false") filled++;
    if (f.required && !v) missingRequired.push(f);
  });
  return { total: fields.length, filled, missingRequired };
}

export type LookupOptions = Record<string, Array<{ value: string; label: string }>>;

export function toNumber(raw: string | undefined): number | undefined {
  const v = raw?.trim();
  if (!v) return undefined;
  const n = Number(v.replace(/[₹,\s]/g, ""));
  return Number.isNaN(n) ? undefined : n;
}

export function buildPerfectEntryPayload(
  values: Record<string, string>,
  marks: string[],
  certificateTypeIds: number[] = [],
): CreatePerfectEntryInput {
  const gi = (key: string) => values[vkey("identity", key)]?.trim() || undefined;
  const gp = (key: string) => values[vkey("placement", key)]?.trim() || undefined;
  const gper = (key: string) => values[vkey("personal", key)]?.trim() || undefined;
  const gr = (key: string) => values[vkey("residence", key)]?.trim() || undefined;
  const gc = (key: string) => values[vkey("counselling", key)]?.trim() || undefined;
  const gs = (key: string) => values[vkey("sensitive", key)]?.trim() || undefined;
  const gf = (key: string) => values[vkey("family", key)]?.trim() || undefined;
  const gco = (key: string) => values[vkey("contacts", key)]?.trim() || undefined;
  const ga = (key: string) => values[vkey("addresses", key)]?.trim() || undefined;
  const gcert = (typeId: number, field: string) => values[vkey("certificates", `${typeId}_${field}`)]?.trim();
  const boolOf = (v: string | undefined) => (v === "true" ? true : v === "false" ? false : undefined);

  // Omit a type entirely if nothing was recorded for it — "not ticked, not
  // attached" isn't the same fact as "ticked false", and the backend
  // shouldn't get a row for a checklist item nobody touched.
  const certificates: CreatePerfectEntryInput["certificates"] = certificateTypeIds
    .map((typeId) => {
      const availableRaw = gcert(typeId, "available");
      const fileUrl = gcert(typeId, "file_url");
      if (availableRaw === undefined && !fileUrl) return undefined;
      return {
        certificate_type_id: typeId,
        is_available: availableRaw === "true" || !!fileUrl,
        file_url: fileUrl,
      };
    })
    .filter((c): c is NonNullable<typeof c> => !!c);

  const sensitiveInfo =
    gs("aadhar_number") || gs("pan_number")
      ? { aadhar_number: gs("aadhar_number"), pan_number: gs("pan_number") }
      : undefined;

  const identityMarks = marks
    .map((description, i) => ({ mark_number: i + 1, description: description.trim() || undefined }))
    .filter((m) => m.description);

  const familyFields = {
    father_name: gf("father_name"),
    father_qualification: gf("father_qualification"),
    father_occupation: gf("father_occupation"),
    father_annual_income: toNumber(gf("father_annual_income")),
    father_email: gf("father_email"),
    father_mobile: gf("father_mobile"),
    mother_name: gf("mother_name"),
    mother_qualification: gf("mother_qualification"),
    mother_occupation: gf("mother_occupation"),
    mother_annual_income: toNumber(gf("mother_annual_income")),
    mother_email: gf("mother_email"),
    mother_mobile: gf("mother_mobile"),
  };
  const familyDetails = Object.values(familyFields).some((v) => v !== undefined) ? familyFields : undefined;

  const contactFields = {
    student_email1: gco("student_email1"),
    student_email2: gco("student_email2"),
    student_mobile: gco("student_mobile"),
  };
  const contacts = Object.values(contactFields).some((v) => v !== undefined) ? contactFields : undefined;

  const addresses: CreatePerfectEntryInput["addresses"] = [];
  if (ga("perm_address_line") || ga("perm_city") || ga("perm_state") || ga("perm_pincode")) {
    addresses.push({
      address_type: "permanent",
      address_line: ga("perm_address_line"),
      city: ga("perm_city"),
      state: ga("perm_state"),
      pincode: ga("perm_pincode"),
    });
  }
  if (ga("temp_address_line") || ga("temp_city") || ga("temp_state") || ga("temp_pincode")) {
    addresses.push({
      address_type: "temporary",
      address_line: ga("temp_address_line"),
      city: ga("temp_city"),
      state: ga("temp_state"),
      pincode: ga("temp_pincode"),
    });
  }

  const studentType = (gr("student_type") as "hosteller" | "dayscholar" | undefined) ?? "dayscholar";
  const dayscholarMode = gr("dayscholar_mode") as "transport" | "own_vehicle" | undefined;

  // Toggle on: omit password entirely so the backend generates its own
  // random 6-digit code (see SoaApplicationsService.generateNumericPassword)
  // — the typed field is hidden via showWhen in this same case, so there's
  // nothing to send anyway.
  const autoGeneratePassword = boolOf(gi("auto_generate_password")) === true;

  return {
    email: gi("email") ?? "",
    password: autoGeneratePassword ? undefined : gi("password"),
    course_id: Number(gp("course")),
    quota_id: Number(gp("quota")),
    batch_id: Number(gp("batch")),
    student_id_no: gi("student_id_no") ?? "",
    roll_no: gi("roll_no"),
    register_no: gi("register_no"),
    admission_no: gi("admission_no"),
    admission_date: gi("admission_date"),
    admission_type: gi("admission_type"),
    joined_academic_year: gi("joined_academic_year"),
    gender: gper("gender"),
    date_of_birth: gper("date_of_birth"),
    blood_group: gper("blood_group"),
    mother_tongue: gper("mother_tongue"),
    nationality: gper("nationality"),
    religion: gper("religion"),
    community: gper("community"),
    caste: gper("caste"),
    is_first_graduate: boolOf(gper("is_first_graduate")),
    is_diff_abled: boolOf(gper("is_diff_abled")),
    diff_abled_info: boolOf(gper("is_diff_abled")) ? gper("diff_abled_info") : undefined,
    is_father_exserviceman: boolOf(gper("is_father_exserviceman")),
    exserviceman_info: boolOf(gper("is_father_exserviceman")) ? gper("exserviceman_info") : undefined,
    student_type: studentType,
    dayscholar_mode: studentType === "dayscholar" ? dayscholarMode : undefined,
    vehicle_number: dayscholarMode === "own_vehicle" ? gr("vehicle_number") : undefined,
    transport_stage_id: dayscholarMode === "transport" ? toNumber(gr("transport_stage_id")) : undefined,
    hostel_room_type_id: studentType === "hosteller" ? toNumber(gr("hostel_room_type_id")) : undefined,
    counselling_order_no: gc("counselling_order_no"),
    counselling_rank_no: gc("counselling_rank_no"),
    govt_quota_admission_no: gc("govt_quota_admission_no"),
    joined_through: gc("joined_through"),
    knew_institution_by: gc("knew_institution_by"),
    nominee: gc("nominee"),
    sensitive_info: sensitiveInfo,
    identity_marks: identityMarks.length ? identityMarks : undefined,
    family_details: familyDetails,
    contacts,
    addresses: addresses.length ? addresses : undefined,
    photo_url: gi("photo_url"),
    certificates: certificates.length ? certificates : undefined,
  };
}
