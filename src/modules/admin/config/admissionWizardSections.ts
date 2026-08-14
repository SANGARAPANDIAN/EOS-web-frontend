/**
 * Mirrors ERP_frontend/assets/js/data/admission-form.js's 14-category structure,
 * reconciled field-by-field against the real backend contract:
 *   EOSbackend1/src/modules/admissions/soa-applications/dto/create-soa-application.dto.ts
 *   EOSbackend1/src/modules/admissions/soa-applications/dto/create-perfect-entry.dto.ts
 *   EOSbackend1/src/modules/admissions/soa-applications/soa-applications.service.ts
 *
 * Every field that the real perfect-entry transaction does not write is marked
 * "disabled" with an honest reason instead of being silently dropped, so the
 * wizard's shape still matches the reference UI's 14 categories.
 */

export type FieldType =
  | "text"
  | "email"
  | "tel"
  | "password"
  | "date"
  | "decimal"
  | "money"
  | "textarea"
  | "bool"
  | "select"
  | "lookup"
  | "disabled"
  | "readonly";

export type LookupKey = "course" | "quota" | "batch" | "transportStage" | "hostelRoomType";

export interface FieldSpec {
  key: string;
  label: string;
  type: FieldType;
  max?: number;
  required?: boolean;
  options?: string[];
  lookup?: LookupKey;
  placeholder?: string;
  defaultValue?: string;
  /** "otherKey" (truthy) or "otherKey=value" — scoped to fields within the same category. */
  showWhen?: string;
  hint?: string;
  disabledReason?: string;
  readonlyValue?: string;
}

export interface FieldGroup {
  label: string;
  hint?: string;
  /** "otherKey" (truthy) or "otherKey=value" — hides the whole group, same syntax as FieldSpec.showWhen. */
  showWhen?: string;
  copyFromPrefix?: { label: string; from: string; to: string };
  fields: FieldSpec[];
}

export interface RepeatSpec {
  max: number;
  addLabel: string;
  rowLabel: string;
  fieldLabel: string;
  fieldMax: number;
  fieldPlaceholder?: string;
  note: string;
}

export interface Category {
  id: string;
  label: string;
  table: string;
  lead: string;
  groups?: FieldGroup[];
  repeat?: RepeatSpec;
  disabledStub?: string;
  review?: boolean;
  /** Renders as CertificateChecklistPanel instead of the generic field-grid CategoryForm — see the wizard's [id]/page.tsx. */
  checklist?: boolean;
}

const MOBILE_HINT = "Exactly 10 digits — the backend rejects anything else.";

export const WIZARD_CATEGORIES: Category[] = [
  {
    id: "application",
    label: "Application",
    table: "soa_applications",
    lead: "The application record. It is created first — this is the only table in the schema that can hold the student's name, and everything else attaches to it.",
    groups: [
      {
        label: "Candidate",
        fields: [
          { key: "first_name", label: "First name", type: "text", max: 100, required: true, placeholder: "Aarav" },
          { key: "last_name", label: "Last name", type: "text", max: 100, placeholder: "Krishnan" },
          { key: "community", label: "Community", type: "text", max: 50, placeholder: "BC" },
        ],
      },
      {
        label: "Parents named on the application",
        fields: [
          { key: "father_name", label: "Father's name", type: "text", max: 150 },
          { key: "mother_name", label: "Mother's name", type: "text", max: 150 },
        ],
      },
      {
        label: "Contact given at application",
        fields: [
          { key: "student_contact", label: "Candidate's mobile", type: "tel", max: 10, hint: MOBILE_HINT },
          { key: "student_whatsapp", label: "WhatsApp number", type: "tel", max: 10, hint: MOBILE_HINT },
          { key: "parent_contact", label: "Parent's mobile", type: "tel", max: 10, hint: MOBILE_HINT },
          { key: "student_email", label: "Email on the application", type: "email" },
        ],
      },
      {
        label: "Board cut-off marks",
        hint: "Each is a percentage, 0–100 with up to two decimal places.",
        fields: [
          { key: "cutoff_maths", label: "Mathematics", type: "decimal", placeholder: "98.50" },
          { key: "cutoff_physics", label: "Physics", type: "decimal", placeholder: "94.00" },
          { key: "cutoff_chemistry", label: "Chemistry", type: "decimal", placeholder: "91.50" },
        ],
      },
      {
        label: "Application state",
        fields: [
          {
            key: "status",
            label: "Status",
            type: "readonly",
            readonlyValue: "Applied",
            hint: "Advanced automatically — fees_paid, then admission_confirmed — right before Perfect Entry runs at the final step. There is no field to set it by hand.",
          },
        ],
      },
    ],
  },
  {
    id: "identity",
    label: "Identity & login",
    table: "users + students",
    lead: "The login account and the institutional numbers. Student ID and admission number are unique across the institution — a clash here is rejected by the backend.",
    groups: [
      {
        label: "Login account",
        fields: [
          {
            key: "email",
            label: "Institutional email",
            type: "email",
            placeholder: "aarav.k2026@sece.ac.in",
            hint: "Optional here, but the backend still requires one to create the login — leaving it blank will fail at the final confirm step.",
          },
          {
            key: "phone",
            label: "Mobile on the account",
            type: "disabled",
            disabledReason: "users.phone is not written by the current perfect-entry endpoint. Use the Contact record category to record a verified mobile.",
          },
          {
            key: "user_status",
            label: "Account status",
            type: "disabled",
            disabledReason: "Always created as active — there is no field to set this at admission time.",
          },
          {
            key: "auto_generate_password",
            label: "Auto-generate a 6-digit password instead of typing one",
            type: "bool",
            defaultValue: "false",
            hint: "On: the backend generates a random 6-digit numeric code and best-effort SMSes it to the mobile number entered in Contact record. Off: you type the password yourself, same as before.",
          },
          {
            key: "password",
            label: "Password",
            type: "password",
            max: 72,
            required: true,
            showWhen: "auto_generate_password=false",
            placeholder: "Minimum 6 characters",
            hint: "You set this — there's no email delivery yet, so hand it to the student directly. If they lose it, use Reset Password from their profile later.",
          },
        ],
      },
      {
        label: "Institutional numbers",
        fields: [
          { key: "student_id_no", label: "Student ID", type: "text", max: 30, required: true, placeholder: "STU2026001" },
          {
            key: "roll_no",
            label: "Roll number",
            type: "text",
            max: 20,
            placeholder: "26CS001",
            hint: "Capped at 20 characters — the backend's limit here is stricter than the schema's column width.",
          },
          { key: "register_no", label: "University register number", type: "text", max: 30, placeholder: "731426104001" },
          { key: "admission_no", label: "Admission number", type: "text", max: 30, placeholder: "ADM/2026/001" },
        ],
      },
      {
        label: "Admission",
        fields: [
          { key: "admission_date", label: "Date of admission", type: "date" },
          { key: "admission_type", label: "Admission type", type: "select", options: ["Counselling", "Management", "Direct", "Lateral Entry"] },
          { key: "joined_academic_year", label: "Joined academic year", type: "text", max: 20, placeholder: "2026-2027" },
          {
            key: "student_status",
            label: "Student status",
            type: "disabled",
            disabledReason: "Always created as active — there is no field to set this at admission time.",
          },
        ],
      },
    ],
  },
  {
    id: "placement",
    label: "Programme & class",
    table: "students",
    lead: "Three foreign keys that must resolve before the row can be written. Section and semester are properties of a class, and the current backend has no way to assign one at admission.",
    groups: [
      {
        label: "Programme",
        fields: [
          { key: "department", label: "Department", type: "lookup", hint: "Narrows the course list below — not written anywhere itself; only course_id is submitted." },
          { key: "course", label: "Course", type: "lookup", lookup: "course", required: true },
          { key: "quota", label: "Quota", type: "lookup", lookup: "quota", required: true },
        ],
      },
      {
        label: "Class allocation",
        fields: [
          { key: "batch", label: "Batch", type: "lookup", lookup: "batch", required: true },
          {
            key: "section",
            label: "Section",
            type: "disabled",
            disabledReason: "No endpoint sets students.class_id yet — the student is admitted without a class assignment and won't appear on any attendance register until one is allocated separately.",
          },
          {
            key: "current_semester",
            label: "Current semester",
            type: "disabled",
            disabledReason: "A property of the class, which isn't assigned at admission — see Section above.",
          },
        ],
      },
    ],
  },
  {
    id: "personal",
    label: "Personal details",
    table: "students",
    lead: "Columns on the students row. Nothing here blocks admission, but the reservation and scholarship workflows read from it.",
    groups: [
      {
        label: "Basics",
        fields: [
          { key: "gender", label: "Gender", type: "select", options: ["Male", "Female", "Other"] },
          { key: "date_of_birth", label: "Date of birth", type: "date" },
          { key: "blood_group", label: "Blood group", type: "select", options: ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"] },
          { key: "mother_tongue", label: "Mother tongue", type: "text", max: 50, placeholder: "Tamil" },
        ],
      },
      {
        label: "Community & nationality",
        fields: [
          { key: "nationality", label: "Nationality", type: "text", max: 50, defaultValue: "Indian" },
          { key: "religion", label: "Religion", type: "text", max: 50 },
          { key: "community", label: "Community", type: "select", options: ["OC", "BC", "MBC", "SC", "ST"] },
          { key: "caste", label: "Caste", type: "text", max: 50 },
        ],
      },
      {
        label: "Declarations",
        hint: "Each flag has its own detail field, asked for only when the flag is set.",
        fields: [
          { key: "is_first_graduate", label: "First graduate in the family", type: "bool" },
          { key: "is_diff_abled", label: "Differently abled", type: "bool" },
          { key: "diff_abled_info", label: "Nature of disability", type: "text", max: 255, showWhen: "is_diff_abled", required: true },
          { key: "is_father_exserviceman", label: "Father is an ex-serviceman", type: "bool" },
          { key: "exserviceman_info", label: "Service details", type: "text", max: 255, showWhen: "is_father_exserviceman", required: true },
        ],
      },
    ],
  },
  {
    id: "residence",
    label: "Residence & travel",
    table: "students + hostel / transport",
    lead: "Residence decides which conditional fields are required. A hosteller needs a room type; a day scholar who commutes by the college bus needs a transport stage.",
    groups: [
      {
        label: "Residence",
        fields: [
          { key: "student_type", label: "Residence", type: "select", options: ["hosteller", "dayscholar"], required: true },
          { key: "dayscholar_mode", label: "How they travel", type: "select", options: ["transport", "own_vehicle"], showWhen: "student_type=dayscholar", required: true },
          { key: "vehicle_number", label: "Vehicle number", type: "text", max: 30, showWhen: "dayscholar_mode=own_vehicle", placeholder: "TN 37 CX 1234", required: true },
        ],
      },
      {
        label: "Hostel allocation",
        showWhen: "student_type=hosteller",
        hint: "Records the room type only — the backend does not yet allocate a specific room (student_hostel_mapping is not written). Complete the actual room assignment separately with the hostel team.",
        fields: [
          { key: "hostel_room_type_id", label: "Room type", type: "lookup", lookup: "hostelRoomType", required: true },
        ],
      },
      {
        label: "Transport",
        showWhen: "dayscholar_mode=transport",
        hint: "The current backend records a single stage — it does not yet capture a separate route and destination, and no student_transport_mapping row is created from this. Complete the route allocation separately with the transport team.",
        fields: [
          { key: "transport_stage_id", label: "Transport stage", type: "lookup", lookup: "transportStage", required: true },
        ],
      },
    ],
  },
  {
    id: "addresses",
    label: "Addresses",
    table: "student_addresses",
    lead: "Two rows, one per address type. The table is unique on (student, type) — one permanent and one temporary address.",
    groups: [
      {
        label: "Permanent address",
        fields: [
          { key: "perm_address_line", label: "Address", type: "textarea", max: 500 },
          { key: "perm_city", label: "City", type: "text", max: 100 },
          { key: "perm_state", label: "State", type: "text", max: 100, defaultValue: "Tamil Nadu" },
          { key: "perm_pincode", label: "PIN code", type: "text", max: 6, placeholder: "641062" },
        ],
      },
      {
        label: "Temporary address",
        copyFromPrefix: { label: "Same as permanent", from: "perm_", to: "temp_" },
        fields: [
          { key: "temp_address_line", label: "Address", type: "textarea", max: 500 },
          { key: "temp_city", label: "City", type: "text", max: 100 },
          { key: "temp_state", label: "State", type: "text", max: 100 },
          { key: "temp_pincode", label: "PIN code", type: "text", max: 6, placeholder: "641062" },
        ],
      },
    ],
  },
  {
    id: "contacts",
    label: "Contact record",
    table: "student_contacts",
    lead: "The student's own contact row, separate from the login account.",
    groups: [
      {
        label: "Reachable on",
        fields: [
          { key: "student_mobile", label: "Mobile", type: "tel", max: 10, hint: MOBILE_HINT },
          { key: "student_email1", label: "Primary email", type: "email" },
          { key: "student_email2", label: "Alternate email", type: "email" },
        ],
      },
    ],
  },
  {
    id: "sensitive",
    label: "Aadhaar & PAN",
    table: "student_sensitive_info",
    lead: "Government identifiers, held in their own table.",
    groups: [
      {
        label: "Identifiers",
        fields: [
          { key: "aadhar_number", label: "Aadhaar number", type: "text", max: 14, placeholder: "1234-5678-9012", hint: "12 digits, optionally grouped with dashes." },
          { key: "pan_number", label: "PAN", type: "text", max: 10, placeholder: "ABCDE1234F", hint: "Five letters, four digits, one letter." },
        ],
      },
    ],
  },
  {
    id: "family",
    label: "Parents & income",
    table: "student_family_details",
    lead: "Both parents on one record. Annual income drives means-tested scholarships.",
    groups: [
      {
        label: "Father",
        fields: [
          { key: "father_name", label: "Name", type: "text", max: 150 },
          { key: "father_qualification", label: "Qualification", type: "text", max: 150 },
          { key: "father_occupation", label: "Occupation", type: "text", max: 150 },
          { key: "father_annual_income", label: "Annual income", type: "money" },
          { key: "father_mobile", label: "Mobile", type: "tel", max: 10, hint: MOBILE_HINT },
          { key: "father_email", label: "Email", type: "email" },
        ],
      },
      {
        label: "Mother",
        fields: [
          { key: "mother_name", label: "Name", type: "text", max: 150 },
          { key: "mother_qualification", label: "Qualification", type: "text", max: 150 },
          { key: "mother_occupation", label: "Occupation", type: "text", max: 150 },
          { key: "mother_annual_income", label: "Annual income", type: "money" },
          { key: "mother_mobile", label: "Mobile", type: "tel", max: 10, hint: MOBILE_HINT },
          { key: "mother_email", label: "Email", type: "email" },
        ],
      },
      {
        label: "Parent portal access",
        fields: [
          {
            key: "parent_login",
            label: "Create a parent login",
            type: "disabled",
            disabledReason: "parent_student_mapping is a separate, competing model that this admission flow doesn't wire up yet. The names above are still saved either way.",
          },
        ],
      },
    ],
  },
  {
    id: "counselling",
    label: "Counselling route",
    table: "students",
    lead: "How the student arrived. Government-quota admissions are audited against the allotment order.",
    groups: [
      {
        label: "Allotment",
        fields: [
          { key: "counselling_order_no", label: "Allotment order number", type: "text", max: 50 },
          { key: "counselling_rank_no", label: "Counselling rank", type: "text", max: 50 },
          { key: "govt_quota_admission_no", label: "Government quota admission number", type: "text", max: 50 },
        ],
      },
      {
        label: "Referral",
        fields: [
          { key: "joined_through", label: "Joined through", type: "text", max: 100, placeholder: "TNEA counselling" },
          { key: "knew_institution_by", label: "Heard about us via", type: "text", max: 100, placeholder: "School counsellor" },
          { key: "nominee", label: "Nominee", type: "text", max: 150 },
        ],
      },
    ],
  },
  {
    id: "marks",
    label: "Identity marks",
    table: "student_identity_marks",
    lead: "Physical identifying marks, recorded for the hall ticket and ID card.",
    repeat: {
      max: 2,
      addLabel: "Add another mark",
      rowLabel: "Mark",
      fieldLabel: "Description",
      fieldMax: 255,
      fieldPlaceholder: "Mole on the left cheek",
      note: "Capped at 2 — the backend only accepts mark_number 1 or 2.",
    },
  },
  {
    id: "certificates",
    label: "Document checklist",
    table: "student_certificates",
    lead: "The originals collected at admission. Tick a document once it's physically collected, attach a scan if you have one — the two are separate facts, and only a verified scan is checked against the original later.",
    checklist: true,
  },
  {
    id: "profiles",
    label: "Online profiles",
    table: "student_profiles",
    lead: "Resume and coding-platform links.",
    disabledStub:
      "Not written by the current perfect-entry endpoint — student_profiles has no insert in this flow. These are normally filled in later by the student.",
  },
  {
    id: "review",
    label: "Review & confirm",
    table: "all real tables",
    lead: "What will be written, and what is still missing. This application is already admission_confirmed — completing the profile runs Perfect Entry, creating the real student and login in one transaction.",
    review: true,
  },
];
