"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Icon } from "@/components/ui/Icon";
import {
  Button,
  ConfirmDialog,
  DatePicker,
  FormField,
  Input,
  PhotoPicker,
  SectionCard,
  Select,
  Stepper,
  useToast,
} from "@/modules/admin/components/ui";
import { friendlyError } from "@/lib/utils/errors";
import { numberFieldOptions, textFieldOptions } from "@/lib/utils/rhf-helpers";
import { OtpVerifyDialog } from "@/modules/admin/components/faculty/OtpVerifyDialog";
import { useDepartments, type Department } from "@/modules/admin/api/refData";
import { useCreateFaculty, type CreateFacultyInput, type Faculty } from "@/modules/admin/api/faculty";
import { useUploadFacultyDocument, useUploadFacultyPhoto } from "@/modules/admin/api/facultyFiles";
import { facultyWizardSchema, type FacultyWizardValues } from "@/modules/admin/schemas/faculty-wizard.schema";
import {
  DESIGNATION_OPTIONS,
  DOCUMENT_TYPE_OPTIONS,
  EMPLOYEE_TYPE_OPTIONS,
  EMPLOYEE_TYPE_TO_ENUM,
  EMPLOYMENT_STATUS_OPTIONS,
  EMPLOYMENT_STATUS_TO_ENUM,
  GENDER_OPTIONS,
  QUALIFICATION_DOCUMENT_TYPE_OPTIONS,
  QUALIFICATION_OPTIONS,
  ROLE_OPTIONS,
  STEP_FIELDS,
  TITLE_OPTIONS,
  WIZARD_STEPS,
  getStepProgress,
} from "@/modules/admin/lib/faculty-wizard-config";
import { avatarToneFor, formatDate, initialsOf, maskTail, todayDateInputValue } from "@/modules/admin/lib/faculty-format";
import { clearDraft, getDraft, saveDraft } from "@/modules/admin/lib/faculty-draft-store";

// Mirrors the backend's ALLOWED_DOCUMENT_MIME_TYPES/MAX_DOCUMENT_BYTES —
// checked here too so a bad file is caught before faculty creation, not
// after (a rejected upload here only surfaces as "N of M uploads failed"
// post-creation, which is much less clear).
const ALLOWED_DOCUMENT_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
const DOCUMENT_FORMAT_HINT = "PDF, JPG, or PNG · up to 10 MB";
const MAX_PHOTO_BYTES = 3 * 1024 * 1024;
const CREATE_DRAFT_KEY = "eos.faculty.create.draft";

const STEP_ICONS: Record<string, string> = {
  basic: "person",
  contact: "mail",
  employment: "layers",
  account: "lock",
  identity: "verified_user",
  qualifications: "school",
  documents: "description",
  review: "check",
};

interface PendingDocument {
  type: string;
  fileName: string;
  file: File;
}

const DEFAULT_VALUES: FacultyWizardValues = {
  profilePhotoName: undefined,
  prefix: "",
  gender: "",
  firstName: "",
  lastName: "",
  dob: undefined,
  personalEmail: "",
  phone: "",
  whatsapp: "",
  officialEmail: undefined,
  alternatePhone: undefined,
  addressLine: undefined,
  city: undefined,
  state: undefined,
  pincode: undefined,
  designation: "",
  departmentId: undefined,
  dateOfJoining: "",
  employmentStatus: "Probation",
  employeeType: undefined,
  workLocation: undefined,
  confirmationDate: undefined,
  probationEndDate: undefined,
  role: "",
  accountStatus: "active",
  aadhar: "",
  pan: "",
  bankName: undefined,
  bankAccount: undefined,
  ifsc: undefined,
  qualification: "",
  specialization: "",
  previousInstitution: undefined,
  experienceYears: undefined,
};

function fieldGrid(children: React.ReactNode) {
  return <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">{children}</div>;
}

/** Staged (not-yet-uploaded) file rows — reused by the Documents step, the
 *  Qualifications step's document panel, and the Review step's combined
 *  recap. Omitting `onRemove` (as the Review step does) hides the remove
 *  affordance. */
function PendingDocumentList({
  documents,
  emptyMessage,
  onRemove,
}: {
  documents: PendingDocument[];
  emptyMessage: string;
  onRemove?: (index: number) => void;
}) {
  if (documents.length === 0) {
    return <p className="text-sm text-admin-muted">{emptyMessage}</p>;
  }
  return (
    <div className="flex flex-col gap-2">
      {documents.map((doc, i) => (
        <div
          key={`${doc.fileName}-${i}`}
          className="flex items-center justify-between rounded-admin-md border border-admin-border px-4 py-3"
        >
          <div className="flex items-center gap-3">
            <Icon name="description" size={18} className="text-admin-subtle" />
            <div>
              <p className="text-sm font-medium text-admin-ink">{doc.fileName}</p>
              <p className="text-xs text-admin-muted">{doc.type}</p>
            </div>
          </div>
          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(i)}
              aria-label="Remove document"
              className="text-admin-subtle hover:text-admin-danger"
            >
              <Icon name="delete" size={16} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export function FacultyCreateWizard() {
  const router = useRouter();
  const { show } = useToast();
  const { data: departments } = useDepartments();
  const createFaculty = useCreateFaculty();

  const [stepIndex, setStepIndex] = useState(0);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [revealSensitive, setRevealSensitive] = useState(false);
  const [createdFaculty, setCreatedFaculty] = useState<Faculty | null>(null);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);

  // Which number-field's OTP dialog is open, plus which fields have already
  // been verified — keyed by field name, storing the value that was
  // verified so an edit to that field after verifying invalidates it again.
  const [otpTarget, setOtpTarget] = useState<"phone" | "whatsapp" | null>(null);
  const [verifiedFields, setVerifiedFields] = useState<Record<string, string>>({});

  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const [documents, setDocuments] = useState<PendingDocument[]>([]);
  const [docType, setDocType] = useState("");
  const docFileRef = useRef<HTMLInputElement>(null);
  const [docFileName, setDocFileName] = useState("No file selected");

  const [qualDocuments, setQualDocuments] = useState<PendingDocument[]>([]);
  const [qualDocType, setQualDocType] = useState("");
  const qualDocFileRef = useRef<HTMLInputElement>(null);
  const [qualDocFileName, setQualDocFileName] = useState("No file selected");

  const {
    register,
    trigger,
    setValue,
    watch,
    getValues,
    formState: { errors },
  } = useForm<FacultyWizardValues>({
    resolver: zodResolver(facultyWizardSchema),
    // Restores an in-progress draft (see the autosave effect below) so a
    // network drop or closed tab doesn't mean re-typing the whole form.
    defaultValues: getDraft<FacultyWizardValues>(CREATE_DRAFT_KEY) ?? DEFAULT_VALUES,
    // Errors only ever appear via the explicit trigger() calls in goToStep/
    // handleCreate below (this wizard doesn't use RHF's own handleSubmit),
    // so `reValidateMode` has no lifecycle to hook into — it only activates
    // once handleSubmit has run. liveClear() below is the real mechanism:
    // it re-validates a field on every keystroke, but only once it already
    // has an error, so it clears the instant the value becomes valid instead
    // of waiting for the next Next/Create Faculty click.
    mode: "onSubmit",
  });

  // Wraps register() so a field's error clears live as soon as its value
  // becomes valid — see the note on useForm above for why RHF's own
  // reValidateMode can't do this here.
  function liveClear(name: keyof FacultyWizardValues, options?: Parameters<typeof register>[1]) {
    const field = register(name, options);
    return {
      ...field,
      onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        field.onChange(event);
        if (errors[name]) trigger(name);
      },
    };
  }

  // eslint-disable-next-line react-hooks/incompatible-library -- react-hook-form's watch() is inherently un-memoizable; calling it here (during render, the documented way) is correct even though the compiler can't verify it.
  const values = watch();
  const step = WIZARD_STEPS[stepIndex];
  const isLastStep = stepIndex === WIZARD_STEPS.length - 1;
  const anyFieldTouched = Object.values(values).some((v) => typeof v === "string" && v.trim() !== "");

  // Notify once, on mount, if a draft was actually restored — computed via
  // a lazy useState initializer rather than re-reading localStorage here so
  // it only ever reflects what was there when the form first loaded, not
  // what's been autosaved since.
  const [hadDraft] = useState(() => getDraft<FacultyWizardValues>(CREATE_DRAFT_KEY) !== null);
  useEffect(() => {
    if (hadDraft) show("Restored your unsaved draft from earlier.", "info");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autosaves the draft locally so a network drop or closed tab doesn't
  // mean re-typing the whole form — debounced so it isn't writing to
  // localStorage on every single keystroke.
  const draftSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current);
    draftSaveTimer.current = setTimeout(() => saveDraft(CREATE_DRAFT_KEY, values), 500);
    return () => {
      if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current);
    };
  }, [values]);

  function stepperSubtext(stepId: string, index: number) {
    if (index === WIZARD_STEPS.length - 1) return "final step";
    const { filled, total } = getStepProgress(stepId, values);
    if (total === 0) return "optional";
    return `${filled} of ${total} filled`;
  }

  function openOtpDialog(field: "phone" | "whatsapp") {
    const value = values[field]?.trim();
    if (!value) {
      show("Enter a number first.", "error");
      return;
    }
    setOtpTarget(field);
  }

  function handleOtpVerified() {
    if (!otpTarget) return;
    setVerifiedFields((prev) => ({ ...prev, [otpTarget]: values[otpTarget] ?? "" }));
    show(`${otpTarget === "phone" ? "Phone" : "WhatsApp"} number verified.`, "success");
    setOtpTarget(null);
  }

  function renderVerifyButton(field: "phone" | "whatsapp") {
    const isVerified = !!values[field] && verifiedFields[field] === values[field];
    if (isVerified) {
      return (
        <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-admin-pill border border-admin-success-border bg-admin-success-bg px-3 py-2 text-xs font-medium text-admin-success-fg">
          <Icon name="check" size={14} /> Verified
        </span>
      );
    }
    return (
      <Button type="button" variant="secondary" onClick={() => openOtpDialog(field)}>
        <Icon name="verified_user" size={14} /> Verify
      </Button>
    );
  }

  async function goToStep(index: number) {
    if (index > stepIndex) {
      const fields = STEP_FIELDS[step.id];
      const valid = fields.length === 0 || (await trigger(fields));
      if (!valid) {
        show("Some fields on this step need attention.", "error");
        return;
      }
    }
    setStepIndex(Math.max(0, Math.min(WIZARD_STEPS.length - 1, index)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleCancel() {
    if (anyFieldTouched) {
      setCancelConfirmOpen(true);
    } else {
      clearDraft(CREATE_DRAFT_KEY);
      router.push("/admin/faculty");
    }
  }

  function handlePhotoPick(file: File) {
    if (file.size > MAX_PHOTO_BYTES) {
      show("Choose an image under 3 MB.", "error");
      return;
    }
    setValue("profilePhotoName", file.name);
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoDataUrl(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  }

  function handleRemovePhoto() {
    setPhotoDataUrl(null);
    setPhotoFile(null);
    setValue("profilePhotoName", "");
  }

  function isValidDocumentFile(file: File): boolean {
    if (!ALLOWED_DOCUMENT_MIME_TYPES.includes(file.type)) {
      show(`That file type isn't supported. Please upload a ${DOCUMENT_FORMAT_HINT} file.`, "error");
      return false;
    }
    if (file.size > MAX_DOCUMENT_BYTES) {
      show(`That file is too large. Please upload a file ${DOCUMENT_FORMAT_HINT}.`, "error");
      return false;
    }
    return true;
  }

  function addDocument() {
    const file = docFileRef.current?.files?.[0];
    if (!docType || !file) {
      show("Choose a document type and a file first.", "error");
      return;
    }
    if (!isValidDocumentFile(file)) return;
    setDocuments((prev) => [...prev, { type: docType, fileName: file.name, file }]);
    setDocType("");
    setDocFileName("No file selected");
    if (docFileRef.current) docFileRef.current.value = "";
  }

  function addQualDocument() {
    const file = qualDocFileRef.current?.files?.[0];
    if (!qualDocType || !file) {
      show("Choose a document type and a file first.", "error");
      return;
    }
    if (!isValidDocumentFile(file)) return;
    setQualDocuments((prev) => [...prev, { type: qualDocType, fileName: file.name, file }]);
    setQualDocType("");
    setQualDocFileName("No file selected");
    if (qualDocFileRef.current) qualDocFileRef.current.value = "";
  }

  // These two are called with a placeholder id (0) until `createdFaculty` is
  // set — safe because they're never actually invoked (see the effect below)
  // until after that state update, at which point this component has
  // already re-rendered with the real faculty id closed over correctly.
  const uploadPhoto = useUploadFacultyPhoto(createdFaculty?.id ?? 0);
  const uploadDocument = useUploadFacultyDocument(createdFaculty?.id ?? 0);
  const uploadsStarted = useRef(false);

  // Staged photo + documents are only ever uploaded after the faculty record
  // itself has been created — there's no create-time photo field on the DTO
  // (needs file storage keyed to a real faculty id), and uploading documents
  // against a not-yet-existing record makes no sense either. Fires once, as
  // soon as `createdFaculty` is set by handleCreate's onSuccess below.
  useEffect(() => {
    if (!createdFaculty || uploadsStarted.current) return;
    uploadsStarted.current = true;

    const tasks: Promise<unknown>[] = [];
    if (photoFile) tasks.push(uploadPhoto.mutateAsync(photoFile));
    for (const doc of [...qualDocuments, ...documents]) {
      tasks.push(uploadDocument.mutateAsync({ file: doc.file, documentType: doc.type }));
    }

    if (tasks.length === 0) {
      show("Faculty created.", "success");
      return;
    }

    setIsUploadingFiles(true);
    Promise.allSettled(tasks).then((results) => {
      setIsUploadingFiles(false);
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed === 0) {
        show("Faculty created — photo and documents uploaded.", "success");
      } else {
        show(
          `Faculty created, but ${failed} of ${tasks.length} file upload(s) failed. Retry from the edit page.`,
          "error",
        );
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createdFaculty]);

  async function handleCreate() {
    const valid = await trigger();
    if (!valid) {
      show("Some required fields are missing. Please review each step.", "error");
      const firstErrorStep = WIZARD_STEPS.findIndex((s) => STEP_FIELDS[s.id].some((f) => f in errors));
      if (firstErrorStep >= 0) setStepIndex(firstErrorStep);
      return;
    }

    const v = getValues();
    // Profile photo, official email and account status still aren't
    // sendable at creation time — no backend field for a photo URL yet
    // (needs file storage, uploaded separately post-creation above), no
    // official_email column, and the backend always creates a faculty
    // record as active regardless of the UI toggle above. Everything else
    // maps to real faculty columns.
    const payload: CreateFacultyInput = {
      email: v.personalEmail,
      first_name: v.firstName,
      last_name: v.lastName,
      designation: v.designation,
      department_id: v.departmentId!,
      phone: v.phone,
      date_of_joining: v.dateOfJoining,
      prefix: v.prefix,
      gender: v.gender,
      date_of_birth: v.dob,
      personal_email: v.personalEmail,
      whatsapp_number: v.whatsapp,
      alternate_phone: v.alternatePhone,
      address_line: v.addressLine,
      city: v.city,
      state: v.state,
      postal_code: v.pincode,
      academic_role: v.role,
      employment_status: EMPLOYMENT_STATUS_TO_ENUM[v.employmentStatus],
      employment_type: v.employeeType ? EMPLOYEE_TYPE_TO_ENUM[v.employeeType] : undefined,
      confirmation_date: v.confirmationDate,
      probation_end_date: v.probationEndDate,
      work_location: v.workLocation,
      qualification: v.qualification,
      specialization: v.specialization,
      previous_institution: v.previousInstitution,
      previous_experience_years: v.experienceYears ? Number(v.experienceYears) : undefined,
      phone_verified: !!v.phone && verifiedFields.phone === v.phone,
      whatsapp_verified: !!v.whatsapp && verifiedFields.whatsapp === v.whatsapp,
      sensitive_info: {
        aadhar_number: v.aadhar,
        pan_number: v.pan.toUpperCase(),
        bank_account_number: v.bankAccount,
        bank_ifsc: v.ifsc?.toUpperCase(),
        bank_name: v.bankName,
      },
    };

    createFaculty.mutate(payload, {
      onSuccess: (faculty) => {
        clearDraft(CREATE_DRAFT_KEY);
        setCreatedFaculty(faculty);
      },
      onError: (err: unknown) => show(friendlyError(err), "error"),
    });
  }

  if (createdFaculty) {
    return (
      <div className="rounded-admin-card border border-admin-border bg-admin-canvas p-10 text-center shadow-admin-resting">
        <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-admin-pill bg-admin-success-bg text-admin-success-fg">
          <Icon name="check" size={28} />
        </span>
        <h2 className="text-lg font-bold text-admin-ink">Faculty created successfully</h2>
        <p className="mt-2 text-sm text-admin-muted">
          {createdFaculty.first_name} {createdFaculty.last_name} has been added.
          {isUploadingFiles && " Uploading photo and documents…"}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href={`/admin/faculty/${createdFaculty.id}`}>
            <Button variant="primary">View Faculty</Button>
          </Link>
          <Link href="/admin/faculty">
            <Button variant="secondary">Back to Faculty List</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-6">
        <div className="w-64 shrink-0">
          <div className="sticky top-20 rounded-admin-card border border-admin-border bg-admin-canvas p-4 shadow-admin-resting">
            <Stepper steps={WIZARD_STEPS} currentIndex={stepIndex} getSubtext={stepperSubtext} onStepClick={goToStep} />
          </div>
        </div>

        <div className="min-w-0 flex-1 rounded-admin-card border border-admin-border bg-admin-canvas">
          <div className="flex items-center justify-between border-b border-admin-divider px-6 py-4">
            <h2 className="text-lg font-bold text-admin-ink">{step.label}</h2>
            <span className="flex size-9 items-center justify-center rounded-admin-pill bg-admin-tint-strong text-admin-primary">
              <Icon name={STEP_ICONS[step.id]} size={18} />
            </span>
          </div>

          <div className="flex flex-col gap-5 p-6">
            {step.id === "basic" && (
              <>
                <FormField label="Faculty ID" hint="Generated automatically. Cannot be edited.">
                  <Input placeholder="FAC1020" disabled />
                </FormField>

                <div>
                  <p className="mb-1.5 text-sm font-medium text-admin-body">
                    Profile photo <span className="font-normal text-admin-subtle">(optional)</span>
                  </p>
                  <PhotoPicker
                    photoDataUrl={photoDataUrl}
                    photoLabel={values.profilePhotoName || undefined}
                    initials={initialsOf({ first_name: values.firstName, last_name: values.lastName })}
                    tone={avatarToneFor(`${values.firstName}${values.lastName}` || "new-faculty")}
                    onPick={handlePhotoPick}
                    onRemove={photoDataUrl ? handleRemovePhoto : undefined}
                  />
                </div>

                {fieldGrid(
                  <>
                    <FormField label="Title" error={errors.prefix?.message}>
                      <Select className={errors.prefix ? "border-admin-danger" : undefined} {...liveClear("prefix")}>
                        <option value="">Select title</option>
                        {TITLE_OPTIONS.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </Select>
                    </FormField>
                    <FormField label="Gender" error={errors.gender?.message}>
                      <Select className={errors.gender ? "border-admin-danger" : undefined} {...liveClear("gender")}>
                        <option value="">Select gender</option>
                        {GENDER_OPTIONS.map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </Select>
                    </FormField>
                  </>,
                )}

                {fieldGrid(
                  <>
                    <FormField label="First name" error={errors.firstName?.message}>
                      <Input
                        placeholder="e.g. Kavitha"
                        className={errors.firstName ? "border-admin-danger" : undefined}
                        {...liveClear("firstName")}
                      />
                    </FormField>
                    <FormField label="Last name" error={errors.lastName?.message}>
                      <Input
                        placeholder="e.g. Rajendran"
                        className={errors.lastName ? "border-admin-danger" : undefined}
                        {...liveClear("lastName")}
                      />
                    </FormField>
                  </>,
                )}

                <FormField label="Date of birth" hint="Optional" error={errors.dob?.message}>
                  <DatePicker
                    max={todayDateInputValue()}
                    className={errors.dob ? "border-admin-danger" : undefined}
                    {...liveClear("dob", textFieldOptions)}
                  />
                </FormField>
              </>
            )}

            {step.id === "contact" && (
              <>
                {fieldGrid(
                  <>
                    <FormField
                      label="Personal email"
                      hint="The only email on file until the official one is issued."
                      error={errors.personalEmail?.message}
                    >
                      <Input
                        type="email"
                        placeholder="name@example.com"
                        className={errors.personalEmail ? "border-admin-danger" : undefined}
                        {...liveClear("personalEmail")}
                      />
                    </FormField>
                    <FormField label="Phone" error={errors.phone?.message}>
                      <div className="flex items-center gap-2">
                        <Input
                          type="tel"
                          placeholder="10-digit mobile number"
                          className={errors.phone ? "border-admin-danger" : undefined}
                          {...liveClear("phone")}
                        />
                        {renderVerifyButton("phone")}
                      </div>
                    </FormField>
                  </>,
                )}

                {fieldGrid(
                  <>
                    <FormField label="WhatsApp number" error={errors.whatsapp?.message}>
                      <div className="flex items-center gap-2">
                        <Input
                          type="tel"
                          placeholder="10-digit mobile number"
                          className={errors.whatsapp ? "border-admin-danger" : undefined}
                          {...liveClear("whatsapp")}
                        />
                        {renderVerifyButton("whatsapp")}
                      </div>
                    </FormField>
                    <FormField
                      label="Official email"
                      hint="Usually issued by IT a few days after joining — add it once available."
                      error={errors.officialEmail?.message}
                    >
                      <Input
                        type="email"
                        placeholder="firstname.lastname@sece.ac.in"
                        className={errors.officialEmail ? "border-admin-danger" : undefined}
                        {...liveClear("officialEmail", textFieldOptions)}
                      />
                    </FormField>
                  </>,
                )}

                <FormField label="Alternate phone" error={errors.alternatePhone?.message}>
                  <Input
                    type="tel"
                    placeholder="10-digit mobile number"
                    className={errors.alternatePhone ? "border-admin-danger" : undefined}
                    {...liveClear("alternatePhone", textFieldOptions)}
                  />
                </FormField>

                <FormField label="Address" error={errors.addressLine?.message}>
                  <Input
                    placeholder="House / street / area"
                    className={errors.addressLine ? "border-admin-danger" : undefined}
                    {...liveClear("addressLine", textFieldOptions)}
                  />
                </FormField>

                {fieldGrid(
                  <>
                    <FormField label="City" error={errors.city?.message}>
                      <Input className={errors.city ? "border-admin-danger" : undefined} {...liveClear("city", textFieldOptions)} />
                    </FormField>
                    <FormField label="State" error={errors.state?.message}>
                      <Input className={errors.state ? "border-admin-danger" : undefined} {...liveClear("state", textFieldOptions)} />
                    </FormField>
                  </>,
                )}

                <FormField label="Postal code" hint="6-digit PIN code" error={errors.pincode?.message}>
                  <Input className={errors.pincode ? "border-admin-danger" : undefined} {...liveClear("pincode", textFieldOptions)} />
                </FormField>
              </>
            )}

            {step.id === "employment" && (
              <>
                {fieldGrid(
                  <>
                    <FormField label="Designation" error={errors.designation?.message}>
                      <Select
                        className={errors.designation ? "border-admin-danger" : undefined}
                        {...liveClear("designation")}
                      >
                        <option value="">Select designation</option>
                        {DESIGNATION_OPTIONS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </Select>
                    </FormField>
                    <FormField label="Department" error={errors.departmentId?.message}>
                      <Select
                        className={errors.departmentId ? "border-admin-danger" : undefined}
                        {...liveClear("departmentId", numberFieldOptions)}
                      >
                        <option value="">Select department</option>
                        {departments?.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.code} — {d.name}
                          </option>
                        ))}
                      </Select>
                    </FormField>
                  </>,
                )}

                {fieldGrid(
                  <>
                    <FormField label="Date of joining" error={errors.dateOfJoining?.message}>
                      <DatePicker
                        className={errors.dateOfJoining ? "border-admin-danger" : undefined}
                        {...liveClear("dateOfJoining")}
                      />
                    </FormField>
                    <FormField label="Employment status" error={errors.employmentStatus?.message}>
                      <Select
                        className={errors.employmentStatus ? "border-admin-danger" : undefined}
                        {...liveClear("employmentStatus")}
                      >
                        {EMPLOYMENT_STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </Select>
                    </FormField>
                  </>,
                )}

                {fieldGrid(
                  <>
                    <FormField label="Employment type" error={errors.employeeType?.message}>
                      <Select
                        className={errors.employeeType ? "border-admin-danger" : undefined}
                        {...liveClear("employeeType")}
                      >
                        <option value="">Select employment type</option>
                        {EMPLOYEE_TYPE_OPTIONS.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </Select>
                    </FormField>
                    <FormField label="Work location" error={errors.workLocation?.message}>
                      <Input
                        placeholder="e.g. Main Campus — A Block"
                        className={errors.workLocation ? "border-admin-danger" : undefined}
                        {...liveClear("workLocation", textFieldOptions)}
                      />
                    </FormField>
                  </>,
                )}

                {fieldGrid(
                  <>
                    <FormField label="Confirmation date" error={errors.confirmationDate?.message}>
                      <DatePicker
                        className={errors.confirmationDate ? "border-admin-danger" : undefined}
                        {...liveClear("confirmationDate", textFieldOptions)}
                      />
                    </FormField>
                    <FormField label="Probation end date" error={errors.probationEndDate?.message}>
                      <DatePicker
                        className={errors.probationEndDate ? "border-admin-danger" : undefined}
                        {...liveClear("probationEndDate", textFieldOptions)}
                      />
                    </FormField>
                  </>,
                )}
              </>
            )}

            {step.id === "account" &&
              fieldGrid(
                <>
                  <FormField label="Role" error={errors.role?.message}>
                    <Select className={errors.role ? "border-admin-danger" : undefined} {...liveClear("role")}>
                      <option value="">Select role</option>
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField
                    label="Account status"
                    hint="Controls system access — separate from employment status. New accounts start Active regardless of this setting until the backend supports it at creation."
                    error={errors.accountStatus?.message}
                  >
                    <Select
                      className={errors.accountStatus ? "border-admin-danger" : undefined}
                      {...liveClear("accountStatus")}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </Select>
                  </FormField>
                </>,
              )}

            {step.id === "identity" && (
              <>
                <div className="flex gap-3 rounded-admin-lg border border-admin-warning-border bg-admin-warning-bg p-4 text-sm text-admin-warning-fg">
                  <Icon name="verified_user" size={20} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold">Access-controlled information</p>
                    <p className="mt-0.5">
                      Visible only to administrators. Never shown on the faculty list or in exports. Payroll details
                      can be added later if not on hand.
                    </p>
                  </div>
                </div>

                {fieldGrid(
                  <>
                    <FormField label="Aadhaar number" hint="12 digits, no spaces." error={errors.aadhar?.message}>
                      <Input
                        placeholder="12-digit Aadhaar number"
                        className={errors.aadhar ? "border-admin-danger" : undefined}
                        {...liveClear("aadhar")}
                      />
                    </FormField>
                    <FormField label="PAN" error={errors.pan?.message}>
                      <Input
                        placeholder="ABCDE1234F"
                        className={errors.pan ? "border-admin-danger" : undefined}
                        {...liveClear("pan")}
                      />
                    </FormField>
                  </>,
                )}

                {fieldGrid(
                  <>
                    <FormField label="Bank name" error={errors.bankName?.message}>
                      <Input
                        placeholder="e.g. State Bank of India"
                        className={errors.bankName ? "border-admin-danger" : undefined}
                        {...liveClear("bankName", textFieldOptions)}
                      />
                    </FormField>
                    <FormField label="Bank account number" error={errors.bankAccount?.message}>
                      <Input
                        className={errors.bankAccount ? "border-admin-danger" : undefined}
                        {...liveClear("bankAccount", textFieldOptions)}
                      />
                    </FormField>
                  </>,
                )}

                <FormField label="IFSC code" error={errors.ifsc?.message}>
                  <Input
                    placeholder="e.g. SBIN0007124"
                    className={errors.ifsc ? "border-admin-danger" : undefined}
                    {...liveClear("ifsc", textFieldOptions)}
                  />
                </FormField>
              </>
            )}

            {step.id === "qualifications" && (
              <>
                {fieldGrid(
                  <>
                    <FormField label="Highest qualification" error={errors.qualification?.message}>
                      <Select
                        className={errors.qualification ? "border-admin-danger" : undefined}
                        {...liveClear("qualification")}
                      >
                        <option value="">Select qualification</option>
                        {QUALIFICATION_OPTIONS.map((q) => (
                          <option key={q} value={q}>
                            {q}
                          </option>
                        ))}
                      </Select>
                    </FormField>
                    <FormField label="Specialization" error={errors.specialization?.message}>
                      <Input
                        placeholder="e.g. Computer Science & Engineering"
                        className={errors.specialization ? "border-admin-danger" : undefined}
                        {...liveClear("specialization")}
                      />
                    </FormField>
                  </>,
                )}

                {fieldGrid(
                  <>
                    <FormField label="Institution / University" error={errors.previousInstitution?.message}>
                      <Input
                        placeholder="e.g. Anna University"
                        className={errors.previousInstitution ? "border-admin-danger" : undefined}
                        {...liveClear("previousInstitution", textFieldOptions)}
                      />
                    </FormField>
                    <FormField label="Previous experience (years)" error={errors.experienceYears?.message}>
                      <Input
                        type="number"
                        min={0}
                        placeholder="e.g. 5"
                        className={errors.experienceYears ? "border-admin-danger" : undefined}
                        {...liveClear("experienceYears", textFieldOptions)}
                      />
                    </FormField>
                  </>,
                )}

                <div className="rounded-admin-lg border border-admin-border p-4">
                  <p className="mb-3 text-sm font-semibold text-admin-body">
                    Qualification &amp; experience documents{" "}
                    <span className="font-normal text-admin-subtle">(optional)</span>
                  </p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Select value={qualDocType} onChange={(e) => setQualDocType(e.target.value)}>
                      <option value="">Select document type</option>
                      {QUALIFICATION_DOCUMENT_TYPE_OPTIONS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </Select>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="secondary" onClick={() => qualDocFileRef.current?.click()}>
                        Choose file
                      </Button>
                      <span className="text-xs text-admin-muted">{qualDocFileName}</span>
                      <input
                        ref={qualDocFileRef}
                        type="file"
                        accept="application/pdf,image/jpeg,image/png"
                        className="hidden"
                        onChange={(e) => setQualDocFileName(e.target.files?.[0]?.name ?? "No file selected")}
                      />
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-admin-muted">Accepted formats: {DOCUMENT_FORMAT_HINT}.</p>
                  <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={addQualDocument}>
                    <Icon name="add" size={14} /> Add qualification document
                  </Button>

                  <div className="mt-4">
                    <PendingDocumentList
                      documents={qualDocuments}
                      emptyMessage="No qualification or experience documents added yet. This step is optional."
                      onRemove={(i) => setQualDocuments((prev) => prev.filter((_, idx) => idx !== i))}
                    />
                  </div>
                </div>
              </>
            )}

            {step.id === "documents" && (
              <>
                <div className="flex gap-3 rounded-admin-lg border border-admin-border-hover bg-admin-tint-strong p-4 text-sm text-admin-primary-deep">
                  <Icon name="description" size={20} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold">Optional — add now or later</p>
                    <p className="mt-0.5">
                      Resume, ID proofs, certificates and other paperwork can be uploaded now or anytime after the
                      record is created.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Select value={docType} onChange={(e) => setDocType(e.target.value)}>
                    <option value="">Select document type</option>
                    {DOCUMENT_TYPE_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </Select>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="secondary" onClick={() => docFileRef.current?.click()}>
                      Choose file
                    </Button>
                    <span className="text-xs text-admin-muted">{docFileName}</span>
                    <input
                      ref={docFileRef}
                      type="file"
                      accept="application/pdf,image/jpeg,image/png"
                      className="hidden"
                      onChange={(e) => setDocFileName(e.target.files?.[0]?.name ?? "No file selected")}
                    />
                  </div>
                </div>
                <p className="text-xs text-admin-muted">Accepted formats: {DOCUMENT_FORMAT_HINT}.</p>
                <Button type="button" variant="secondary" size="sm" onClick={addDocument} className="self-start">
                  <Icon name="add" size={14} /> Add document
                </Button>

                <PendingDocumentList
                  documents={documents}
                  emptyMessage="No documents added yet. This step is optional — you can upload these later from the faculty profile."
                  onRemove={(i) => setDocuments((prev) => prev.filter((_, idx) => idx !== i))}
                />
              </>
            )}

            {step.id === "review" && (
              <ReviewStep
                values={values}
                departments={departments}
                documents={documents}
                qualDocuments={qualDocuments}
                revealSensitive={revealSensitive}
                onToggleReveal={() => setRevealSensitive((v) => !v)}
                onEditStep={goToStep}
              />
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex gap-6">
        <div className="w-64 shrink-0" aria-hidden="true" />
        <div className="flex min-w-0 flex-1 items-center justify-between gap-3 pl-3">
          <button
            type="button"
            onClick={handleCancel}
            className="text-sm font-medium text-admin-body hover:text-admin-ink"
          >
            Cancel
          </button>
          <div className="flex gap-2">
            {stepIndex > 0 && (
              <Button type="button" variant="secondary" onClick={() => goToStep(stepIndex - 1)}>
                <Icon name="chevron_left" size={16} /> Back
              </Button>
            )}
            {isLastStep ? (
              <Button type="button" variant="primary" disabled={createFaculty.isPending} onClick={handleCreate}>
                <Icon name="check" size={16} /> {createFaculty.isPending ? "Creating…" : "Create Faculty"}
              </Button>
            ) : (
              <Button type="button" variant="primary" onClick={() => goToStep(stepIndex + 1)}>
                Next <Icon name="chevron_right" size={16} />
              </Button>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={cancelConfirmOpen}
        title="Discard this new faculty record?"
        message="The information entered so far will be lost."
        confirmLabel="Discard"
        destructive
        onConfirm={() => {
          clearDraft(CREATE_DRAFT_KEY);
          router.push("/admin/faculty");
        }}
        onClose={() => setCancelConfirmOpen(false)}
      />

      <OtpVerifyDialog
        open={otpTarget !== null}
        fieldLabel={otpTarget === "whatsapp" ? "WhatsApp number" : "mobile number"}
        channel={otpTarget === "whatsapp" ? "whatsapp" : "sms"}
        phoneNumber={otpTarget ? values[otpTarget] ?? "" : ""}
        onVerified={handleOtpVerified}
        onClose={() => setOtpTarget(null)}
      />
    </div>
  );
}

interface ReviewStepProps {
  values: FacultyWizardValues;
  departments?: Department[];
  documents: PendingDocument[];
  qualDocuments: PendingDocument[];
  revealSensitive: boolean;
  onToggleReveal: () => void;
  onEditStep: (index: number) => void;
}

function ReviewCard({
  title,
  stepIndex,
  onEdit,
  extraAction,
  rows,
}: {
  title: string;
  stepIndex: number;
  onEdit: (index: number) => void;
  extraAction?: React.ReactNode;
  rows: [string, React.ReactNode][];
}) {
  return (
    <SectionCard
      title={title}
      actions={
        <div className="flex items-center gap-3">
          {extraAction}
          <button
            type="button"
            onClick={() => onEdit(stepIndex)}
            className="flex items-center gap-1 text-xs font-semibold text-admin-primary hover:text-admin-primary-dark"
          >
            <Icon name="edit" size={13} /> Edit
          </button>
        </div>
      }
    >
      <dl className="divide-y divide-admin-divider">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between py-2.5 text-sm first:pt-0 last:pb-0">
            <dt className="text-admin-muted">{label}</dt>
            <dd className="font-medium text-admin-ink">{value}</dd>
          </div>
        ))}
      </dl>
    </SectionCard>
  );
}

function ReviewStep({
  values,
  departments,
  documents,
  qualDocuments,
  revealSensitive,
  onToggleReveal,
  onEditStep,
}: ReviewStepProps) {
  const dept = departments?.find((d) => d.id === values.departmentId);
  const name = [values.prefix, values.firstName, values.lastName].filter(Boolean).join(" ");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3 rounded-admin-lg border border-admin-border-hover bg-admin-tint-strong p-4 text-sm text-admin-primary-deep">
        <Icon name="check" size={20} className="mt-0.5 shrink-0" />
        <p>
          Check every field below. Use Edit to jump back to any step. Fields left blank show as “Not provided” and
          can be filled in anytime from the faculty profile.
        </p>
      </div>

      <ReviewCard
        title="Basic Information"
        stepIndex={0}
        onEdit={onEditStep}
        rows={[
          ["Name", name || "Not provided"],
          ["Gender", values.gender || "Not provided"],
          ["Date of birth", values.dob ? formatDate(values.dob) : "Not provided"],
          ["Profile photo", values.profilePhotoName || "Not provided"],
        ]}
      />

      <ReviewCard
        title="Contact Information"
        stepIndex={1}
        onEdit={onEditStep}
        rows={[
          ["Personal email", values.personalEmail || "Not provided"],
          ["Phone", values.phone || "Not provided"],
          ["WhatsApp number", values.whatsapp || "Not provided"],
          ["Official email", values.officialEmail || "Not provided"],
          ["Alternate phone", values.alternatePhone || "Not provided"],
          ["Address", values.addressLine || "Not provided"],
          ["City", values.city || "Not provided"],
          ["State", values.state || "Not provided"],
          ["Postal code", values.pincode || "Not provided"],
        ]}
      />

      <ReviewCard
        title="Employment Information"
        stepIndex={2}
        onEdit={onEditStep}
        rows={[
          ["Designation", values.designation || "Not provided"],
          ["Department", dept ? `${dept.code} — ${dept.name}` : "Not provided"],
          ["Date of joining", values.dateOfJoining ? formatDate(values.dateOfJoining) : "Not provided"],
          ["Employment status", values.employmentStatus || "Not provided"],
          ["Employment type", values.employeeType || "Not provided"],
          ["Work location", values.workLocation || "Not provided"],
          ["Confirmation date", values.confirmationDate ? formatDate(values.confirmationDate) : "Not provided"],
          ["Probation end date", values.probationEndDate ? formatDate(values.probationEndDate) : "Not provided"],
        ]}
      />

      <ReviewCard
        title="Account Information"
        stepIndex={3}
        onEdit={onEditStep}
        rows={[
          ["Role", values.role || "Not provided"],
          ["Account status", values.accountStatus === "active" ? "Active" : "Inactive"],
        ]}
      />

      <ReviewCard
        title="Identity"
        stepIndex={4}
        onEdit={onEditStep}
        extraAction={
          <button
            type="button"
            onClick={onToggleReveal}
            className="text-xs font-semibold text-admin-primary hover:text-admin-primary-dark"
          >
            {revealSensitive ? "Hide" : "Show"}
          </button>
        }
        rows={[
          ["Aadhaar number", revealSensitive ? values.aadhar || "Not provided" : maskTail(values.aadhar)],
          ["PAN", revealSensitive ? values.pan?.toUpperCase() || "Not provided" : maskTail(values.pan)],
          ["Bank name", values.bankName || "Not provided"],
          [
            "Bank account",
            revealSensitive ? values.bankAccount || "Not provided" : maskTail(values.bankAccount),
          ],
          ["IFSC", values.ifsc?.toUpperCase() || "Not provided"],
        ]}
      />

      <ReviewCard
        title="Qualifications"
        stepIndex={5}
        onEdit={onEditStep}
        rows={[
          ["Highest qualification", values.qualification || "Not provided"],
          ["Specialization", values.specialization || "Not provided"],
          ["Institution / University", values.previousInstitution || "Not provided"],
          ["Previous experience", values.experienceYears ? `${values.experienceYears} years` : "Not provided"],
        ]}
      />

      <SectionCard
        title="Documents"
        actions={
          <button
            type="button"
            onClick={() => onEditStep(6)}
            className="flex items-center gap-1 text-xs font-semibold text-admin-primary hover:text-admin-primary-dark"
          >
            <Icon name="edit" size={13} /> Edit
          </button>
        }
      >
        <PendingDocumentList documents={[...qualDocuments, ...documents]} emptyMessage="No documents added." />
      </SectionCard>
    </div>
  );
}
