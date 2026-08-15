"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, type UseFormRegister } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Icon } from "@/components/ui/Icon";
import {
  Button,
  ConfirmDialog,
  DatePicker,
  FormField,
  Input,
  PhotoPicker,
  Select,
  TypeToConfirmDialog,
  useToast,
} from "@/modules/admin/components/ui";
import { friendlyError } from "@/lib/utils/errors";
import { numberFieldOptions, textFieldOptions } from "@/lib/utils/rhf-helpers";
import { OtpVerifyDialog } from "@/modules/admin/components/faculty/OtpVerifyDialog";
import { useDepartments } from "@/modules/admin/api/refData";
import { useUpdateFaculty, type Faculty, type UpdateFacultyInput } from "@/modules/admin/api/faculty";
import { useRemoveFacultyPhoto, useUploadFacultyPhoto } from "@/modules/admin/api/facultyFiles";
import { facultyEditSchema, type FacultyEditValues } from "@/modules/admin/schemas/faculty-edit.schema";
import {
  DESIGNATION_OPTIONS,
  EMPLOYEE_TYPE_FROM_ENUM,
  EMPLOYEE_TYPE_OPTIONS,
  EMPLOYEE_TYPE_TO_ENUM,
  EMPLOYMENT_STATUS_FROM_ENUM,
  EMPLOYMENT_STATUS_OPTIONS,
  EMPLOYMENT_STATUS_TO_ENUM,
  GENDER_OPTIONS,
  QUALIFICATION_OPTIONS,
  ROLE_OPTIONS,
  TITLE_OPTIONS,
} from "@/modules/admin/lib/faculty-wizard-config";
import { avatarToneFor, formatFacultyCode, fullName, initialsOf, toDateInputValue, todayDateInputValue } from "@/modules/admin/lib/faculty-format";
import { clearDraft, getDraft, saveDraft } from "@/modules/admin/lib/faculty-draft-store";

const SECTIONS = [
  { id: "basic", label: "Basic Information", icon: "person" },
  { id: "contact", label: "Contact Information", icon: "mail" },
  { id: "account", label: "Account Information", icon: "lock" },
  { id: "employment", label: "Employment", icon: "layers" },
  { id: "identity", label: "Identity", icon: "verified_user" },
] as const;

const MAX_PHOTO_BYTES = 3 * 1024 * 1024;

function editDraftKey(facultyId: number): string {
  return `eos.faculty.edit.draft.${facultyId}`;
}

function toDefaults(faculty: Faculty): FacultyEditValues {
  return {
    profilePhotoName: undefined,
    prefix: faculty.prefix ?? undefined,
    gender: faculty.gender ?? undefined,
    first_name: faculty.first_name,
    last_name: faculty.last_name,
    dob: toDateInputValue(faculty.date_of_birth) || undefined,
    designation: faculty.designation,
    department_id: faculty.department_id ?? faculty.department?.id,
    date_of_joining: toDateInputValue(faculty.date_of_joining) || undefined,
    personalEmail: faculty.personal_email ?? undefined,
    phone: faculty.phone ?? undefined,
    alternatePhone: faculty.alternate_phone ?? undefined,
    addressLine: faculty.address_line ?? undefined,
    city: faculty.city ?? undefined,
    state: faculty.state ?? undefined,
    pincode: faculty.postal_code ?? undefined,
    role: faculty.academic_role ?? undefined,
    status: faculty.status,
    employmentStatus: faculty.employment_status ? EMPLOYMENT_STATUS_FROM_ENUM[faculty.employment_status] : undefined,
    employeeType: faculty.employment_type ? EMPLOYEE_TYPE_FROM_ENUM[faculty.employment_type] : undefined,
    confirmationDate: toDateInputValue(faculty.confirmation_date) || undefined,
    probationEndDate: toDateInputValue(faculty.probation_end_date) || undefined,
    workLocation: faculty.work_location ?? undefined,
    qualification: faculty.qualification ?? undefined,
    specialization: faculty.specialization ?? undefined,
    officeRoom: faculty.office_room ?? undefined,
    // UI-only — `reportingTo` has no backing column yet (it would be an
    // integer faculty_id FK, not free text — wiring it needs a searchable
    // faculty picker) and `profilePhotoName` is superseded by the immediate
    // photo upload/remove flow below. Neither is ever sent to the backend.
    reportingTo: undefined,
    aadhar_number: undefined,
    pan_number: undefined,
    bank_account_number: undefined,
    bank_ifsc: undefined,
    bank_name: undefined,
  };
}

function toSensitiveInfo(values: FacultyEditValues) {
  const hasAny = values.aadhar_number || values.pan_number || values.bank_account_number || values.bank_ifsc || values.bank_name;
  if (!hasAny) return undefined;
  return {
    aadhar_number: values.aadhar_number,
    pan_number: values.pan_number?.toUpperCase(),
    bank_account_number: values.bank_account_number,
    bank_ifsc: values.bank_ifsc?.toUpperCase(),
    bank_name: values.bank_name,
  };
}

function fieldGrid(children: React.ReactNode) {
  return <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">{children}</div>;
}

function EditSectionCard({
  id,
  title,
  desc,
  icon,
  registerRef,
  children,
}: {
  id: string;
  title: string;
  desc: string;
  icon: string;
  registerRef: (id: string, el: HTMLDivElement | null) => void;
  children: React.ReactNode;
}) {
  return (
    <div id={`section-${id}`} ref={(el) => registerRef(id, el)} className="scroll-mt-24 rounded-admin-card border border-admin-border bg-admin-canvas p-6">
      <div className="flex items-start justify-between gap-4 border-b border-admin-divider pb-5">
        <div>
          <h3 className="text-lg font-bold text-admin-ink">{title}</h3>
          <p className="mt-1 text-sm text-admin-muted">{desc}</p>
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-admin-pill bg-admin-tint-strong text-admin-primary">
          <Icon name={icon} size={18} />
        </span>
      </div>
      <div className="mt-5 flex flex-col gap-5">{children}</div>
    </div>
  );
}

export function FacultyEditForm({ faculty }: { faculty: Faculty }) {
  const router = useRouter();
  const profileHref = `/admin/faculty/${faculty.id}`;
  const { show, showDetailed } = useToast();
  const { data: departments } = useDepartments();
  const updateFaculty = useUpdateFaculty();
  const toggleStatus = useUpdateFaculty();
  const uploadPhoto = useUploadFacultyPhoto(faculty.id);
  const removePhoto = useRemoveFacultyPhoto(faculty.id);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    trigger,
    formState: { errors, isDirty, dirtyFields },
  } = useForm<FacultyEditValues>({
    resolver: zodResolver(facultyEditSchema),
    // Restores an in-progress draft (see the autosave effect below) so a
    // network drop or closed tab doesn't mean redoing every edit.
    defaultValues: getDraft<FacultyEditValues>(editDraftKey(faculty.id)) ?? toDefaults(faculty),
    mode: "onSubmit",
  });

  // reValidateMode only takes effect once handleSubmit has actually run
  // once, so it doesn't reliably clear an error on the very first attempt.
  // This re-validates a field on every keystroke, but only once it already
  // has an error, so it clears live instead of waiting for another Save click.
  function liveClear(name: keyof FacultyEditValues, options?: Parameters<UseFormRegister<FacultyEditValues>>[1]) {
    const field = register(name, options);
    return {
      ...field,
      onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        field.onChange(event);
        if (errors[name]) trigger(name);
      },
    };
  }

  const unsavedCount = Object.keys(dirtyFields).length;
  const draftKey = editDraftKey(faculty.id);

  // Unlike the create wizard, editing an existing record's unsaved changes
  // aren't announced with a toast on restore — the draft still silently
  // repopulates the form (see `defaultValues` above), just without the
  // notification, since re-opening an edit is a much lower-stakes moment
  // than recovering a multi-step wizard draft.

  // Autosaves the draft locally so a network drop or closed tab doesn't
  // mean redoing every edit — debounced so it isn't writing to localStorage
  // on every keystroke.
  // eslint-disable-next-line react-hooks/incompatible-library -- react-hook-form's watch() is inherently un-memoizable; calling it here (during render, the documented way) is correct even though the compiler can't verify it.
  const editValues = watch();
  const draftSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current);
    draftSaveTimer.current = setTimeout(() => saveDraft(draftKey, editValues), 500);
    return () => {
      if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current);
    };
  }, [editValues, draftKey]);

  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
  const [phoneOtpOpen, setPhoneOtpOpen] = useState(false);
  const [phoneVerifiedValue, setPhoneVerifiedValue] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState<string>(SECTIONS[0].id);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(faculty.profile_url ?? null);

  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  function registerSectionRef(id: string, el: HTMLDivElement | null) {
    sectionRefs.current[id] = el;
  }

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) {
          const id = visible[0].target.id.replace("section-", "");
          setActiveSection(id);
        }
      },
      { rootMargin: "-96px 0px -70% 0px", threshold: 0 },
    );
    SECTIONS.forEach((s) => {
      const node = sectionRefs.current[s.id];
      if (node) observer.observe(node);
    });
    return () => observer.disconnect();
  }, []);

  function scrollToSection(id: string) {
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const phone = watch("phone");

  function openPhoneOtp() {
    if (!phone?.trim()) {
      show("Enter a phone number first.", "error");
      return;
    }
    setPhoneOtpOpen(true);
  }

  function handlePhoneVerified() {
    setPhoneVerifiedValue(phone ?? "");
    show("Phone number verified.", "success");
    setPhoneOtpOpen(false);
  }

  function handlePhotoPick(file: File) {
    if (file.size > MAX_PHOTO_BYTES) {
      show("Choose an image under 3 MB.", "error");
      return;
    }
    uploadPhoto.mutate(file, {
      onSuccess: (res) => {
        setPhotoDataUrl(res.profile_url);
        show("Profile photo updated.", "success");
      },
      onError: (err: unknown) => show(friendlyError(err), "error"),
    });
  }

  function handleRemovePhoto() {
    removePhoto.mutate(undefined, {
      onSuccess: (res) => {
        setPhotoDataUrl(res.profile_url);
        show("Profile photo removed.", "success");
      },
      onError: (err: unknown) => show(friendlyError(err), "error"),
    });
  }

  function handleCancel() {
    if (isDirty) {
      setCancelConfirmOpen(true);
    } else {
      clearDraft(draftKey);
      router.push(profileHref);
    }
  }

  function handleReset() {
    if (!isDirty) return;
    setResetConfirmOpen(true);
  }

  function confirmReset() {
    reset(toDefaults(faculty));
    setPhotoDataUrl(faculty.profile_url ?? null);
    clearDraft(draftKey);
    setResetConfirmOpen(false);
    show("Form reset to its saved values.", "info");
  }

  function onSubmit(values: FacultyEditValues) {
    const sensitive_info = toSensitiveInfo(values);
    updateFaculty
      .mutateAsync({
        id: faculty.id,
        input: {
          first_name: values.first_name,
          last_name: values.last_name,
          designation: values.designation,
          department_id: values.department_id!,
          date_of_joining: values.date_of_joining,
          status: values.status,
          phone: values.phone,
          prefix: values.prefix,
          gender: values.gender,
          date_of_birth: values.dob,
          personal_email: values.personalEmail,
          alternate_phone: values.alternatePhone,
          address_line: values.addressLine,
          city: values.city,
          state: values.state,
          postal_code: values.pincode,
          academic_role: values.role,
          employment_status: values.employmentStatus ? EMPLOYMENT_STATUS_TO_ENUM[values.employmentStatus] : undefined,
          employment_type: values.employeeType ? EMPLOYEE_TYPE_TO_ENUM[values.employeeType] : undefined,
          confirmation_date: values.confirmationDate,
          probation_end_date: values.probationEndDate,
          work_location: values.workLocation,
          qualification: values.qualification,
          specialization: values.specialization,
          office_room: values.officeRoom,
          phone_verified: !!values.phone && phoneVerifiedValue === values.phone,
          sensitive_info,
        } satisfies UpdateFacultyInput,
      })
      .then(() => {
        clearDraft(draftKey);
        showDetailed("Changes saved", `Record updated for ${fullName(faculty)}.`, "success");
        router.push(profileHref);
      })
      .catch((err: unknown) => {
        show(friendlyError(err), "error");
      });
  }

  function handleToggleStatus() {
    const nextStatus = faculty.status === "active" ? "inactive" : "active";
    toggleStatus.mutate(
      { id: faculty.id, input: { status: nextStatus } },
      {
        onSuccess: () => {
          show(nextStatus === "active" ? "Faculty reactivated." : "Faculty deactivated.", "success");
          setStatusConfirmOpen(false);
          router.push(profileHref);
        },
        onError: (err: unknown) => show(friendlyError(err), "error"),
      },
    );
  }

  const knownDesignations = !DESIGNATION_OPTIONS.includes(faculty.designation) ? [faculty.designation, ...DESIGNATION_OPTIONS] : DESIGNATION_OPTIONS;

  const isPending = updateFaculty.isPending;
  const isTogglingStatus = toggleStatus.isPending;
  const isPhotoBusy = uploadPhoto.isPending || removePhoto.isPending;

  return (
    <div>
      <nav className="mb-2 flex items-center gap-1.5 text-sm text-admin-muted">
        <Link href="/admin/dashboard" className="hover:text-admin-body">
          Home
        </Link>
        <Icon name="chevron_right" size={15} />
        <Link href="/admin/faculty" className="hover:text-admin-body">
          Faculty
        </Link>
        <Icon name="chevron_right" size={15} />
        <Link href={profileHref} className="hover:text-admin-body">
          {fullName(faculty)}
        </Link>
        <Icon name="chevron_right" size={15} />
        <span className="font-semibold text-admin-body">Edit</span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-admin-ink">Edit faculty record</h1>
          <p className="mt-0.5 text-sm text-admin-muted">
            {fullName(faculty)} · {formatFacultyCode(faculty.id)} · {faculty.department?.name ?? "No department"}
          </p>
        </div>
        <Link href={profileHref} className="flex items-center gap-1.5 text-sm font-semibold text-admin-body hover:text-admin-ink">
          <Icon name="visibility" size={15} /> View profile
        </Link>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="sticky top-0 z-10 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-admin-card border border-admin-border bg-admin-canvas/95 px-4 py-3 backdrop-blur">
          {unsavedCount > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-admin-pill bg-admin-warning-bg px-2.5 py-1 text-xs font-semibold text-admin-warning-fg">
              <span className="h-1.5 w-1.5 rounded-admin-pill bg-admin-warning-fg" /> {unsavedCount} unsaved change{unsavedCount === 1 ? "" : "s"}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-admin-pill bg-admin-tint px-2.5 py-1 text-xs font-semibold text-admin-muted">
              <span className="h-1.5 w-1.5 rounded-admin-pill bg-admin-subtle" /> No changes
            </span>
          )}
          <div className="flex items-center gap-2">
            <Button type="button" variant="text" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="button" variant="secondary" onClick={handleReset} disabled={!isDirty}>
              <Icon name="undo" size={14} /> Reset
            </Button>
            <Button type="submit" variant="primary" disabled={!isDirty || isPending}>
              <Icon name="check" size={14} /> {isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>

        <div className="mt-4 flex gap-6">
          <aside className={`shrink-0 ${collapsed ? "w-auto" : "w-56"}`}>
            <div className="sticky top-20 rounded-admin-card border border-admin-border bg-admin-canvas p-3 shadow-admin-resting">
              <div className="flex items-center justify-between px-1 pb-2">
                {!collapsed && <p className="text-[11px] font-semibold tracking-wide text-admin-subtle uppercase">Sections</p>}
                <button
                  type="button"
                  onClick={() => setCollapsed((v) => !v)}
                  className="text-admin-subtle hover:text-admin-body"
                  aria-label={collapsed ? "Expand sections" : "Collapse sections"}
                >
                  <Icon name={collapsed ? "keyboard_double_arrow_right" : "keyboard_double_arrow_left"} size={16} />
                </button>
              </div>
              <nav className="flex flex-col gap-0.5">
                {SECTIONS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => scrollToSection(s.id)}
                    title={collapsed ? s.label : undefined}
                    className={`flex items-center gap-2 rounded-admin-md px-3 py-2 text-left text-sm font-medium transition-colors ${collapsed ? "justify-center" : ""} ${
                      activeSection === s.id ? "bg-admin-tint-strong text-admin-primary-deep" : "text-admin-body hover:bg-admin-tint"
                    }`}
                  >
                    <Icon name={s.icon} size={16} className="shrink-0" />
                    {!collapsed && <span>{s.label}</span>}
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col gap-5">
            <EditSectionCard id="basic" title="Basic Information" desc="Name, designation and department placement." icon="person" registerRef={registerSectionRef}>
              <div>
                <p className="mb-1.5 text-sm font-medium text-admin-body">
                  Profile photo <span className="font-normal text-admin-subtle">(optional)</span>
                </p>
                <PhotoPicker
                  photoDataUrl={photoDataUrl}
                  initials={initialsOf(faculty)}
                  tone={avatarToneFor(faculty.id)}
                  isUploading={isPhotoBusy}
                  onPick={handlePhotoPick}
                  onRemove={photoDataUrl ? handleRemovePhoto : undefined}
                />
              </div>

              {fieldGrid(
                <>
                  <FormField label="Title">
                    <Select {...liveClear("prefix")}>
                      <option value="">Select title</option>
                      {TITLE_OPTIONS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField label="Gender">
                    <Select {...liveClear("gender")}>
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
                  <FormField label="First name" error={errors.first_name?.message}>
                    <Input className={errors.first_name ? "border-admin-danger" : undefined} {...liveClear("first_name")} />
                  </FormField>
                  <FormField label="Last name" error={errors.last_name?.message}>
                    <Input className={errors.last_name ? "border-admin-danger" : undefined} {...liveClear("last_name")} />
                  </FormField>
                </>,
              )}

              {fieldGrid(
                <>
                  <FormField label="Date of birth" error={errors.dob?.message}>
                    <DatePicker max={todayDateInputValue()} {...liveClear("dob", textFieldOptions)} />
                  </FormField>
                  <FormField label="Faculty ID" hint="Generated automatically. Cannot be edited.">
                    <Input value={formatFacultyCode(faculty.id)} disabled className="font-mono" />
                  </FormField>
                </>,
              )}

              {fieldGrid(
                <>
                  <FormField label="Designation" error={errors.designation?.message}>
                    <Select className={errors.designation ? "border-admin-danger" : undefined} {...liveClear("designation")}>
                      {knownDesignations.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField label="Department" error={errors.department_id?.message}>
                    <Select className={errors.department_id ? "border-admin-danger" : undefined} {...liveClear("department_id", numberFieldOptions)}>
                      <option value="">Select a department</option>
                      {departments?.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                </>,
              )}

              <FormField label="Date of joining" error={errors.date_of_joining?.message}>
                <DatePicker {...liveClear("date_of_joining", textFieldOptions)} />
              </FormField>
            </EditSectionCard>

            <EditSectionCard
              id="contact"
              title="Contact Information"
              desc="How to reach this faculty member — official and personal channels."
              icon="mail"
              registerRef={registerSectionRef}
            >
              {fieldGrid(
                <>
                  <FormField label="Personal email" hint="The only email on file until the official one is issued." error={errors.personalEmail?.message}>
                    <Input type="email" className={errors.personalEmail ? "border-admin-danger" : undefined} {...liveClear("personalEmail", textFieldOptions)} />
                  </FormField>
                  <FormField label="Phone" error={errors.phone?.message}>
                    <div className="flex items-center gap-2">
                      <Input type="tel" className={errors.phone ? "border-admin-danger" : undefined} {...liveClear("phone", textFieldOptions)} />
                      {phone && phoneVerifiedValue === phone ? (
                        <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-admin-pill border border-admin-success-border bg-admin-success-bg px-3 py-2 text-xs font-medium text-admin-success-fg">
                          <Icon name="check" size={14} /> Verified
                        </span>
                      ) : (
                        <Button type="button" variant="secondary" onClick={openPhoneOtp}>
                          <Icon name="verified_user" size={14} /> Verify
                        </Button>
                      )}
                    </div>
                  </FormField>
                </>,
              )}

              {fieldGrid(
                <>
                  <FormField label="Official email" hint="Usually issued by IT a few days after joining — set at creation, can't be changed here.">
                    <Input type="email" disabled value={faculty.email} />
                  </FormField>
                  <FormField label="Alternate phone" error={errors.alternatePhone?.message}>
                    <Input type="tel" className={errors.alternatePhone ? "border-admin-danger" : undefined} {...liveClear("alternatePhone", textFieldOptions)} />
                  </FormField>
                </>,
              )}

              <FormField label="Address" error={errors.addressLine?.message}>
                <Input {...liveClear("addressLine", textFieldOptions)} />
              </FormField>

              {fieldGrid(
                <>
                  <FormField label="City" error={errors.city?.message}>
                    <Input {...liveClear("city", textFieldOptions)} />
                  </FormField>
                  <FormField label="State" error={errors.state?.message}>
                    <Input {...liveClear("state", textFieldOptions)} />
                  </FormField>
                </>,
              )}

              <FormField label="Postal code" error={errors.pincode?.message}>
                <Input className={errors.pincode ? "border-admin-danger" : undefined} {...liveClear("pincode", textFieldOptions)} />
              </FormField>
            </EditSectionCard>

            <EditSectionCard id="account" title="Account Information" desc="System access and role." icon="lock" registerRef={registerSectionRef}>
              {fieldGrid(
                <>
                  <FormField label="Role">
                    <Select {...liveClear("role")}>
                      <option value="">Select role</option>
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField label="Account status" hint="Changing this immediately affects portal access." error={errors.status?.message}>
                    <Select {...liveClear("status")}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </Select>
                  </FormField>
                </>,
              )}
            </EditSectionCard>

            <EditSectionCard
              id="employment"
              title="Employment"
              desc="Service record, employment terms and reporting details."
              icon="layers"
              registerRef={registerSectionRef}
            >
              {fieldGrid(
                <>
                  <FormField label="Employment status">
                    <Select {...liveClear("employmentStatus")}>
                      <option value="">Select status</option>
                      {EMPLOYMENT_STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField label="Employment type">
                    <Select {...liveClear("employeeType")}>
                      <option value="">Select employment type</option>
                      {EMPLOYEE_TYPE_OPTIONS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                </>,
              )}

              {fieldGrid(
                <>
                  <FormField label="Confirmation date">
                    <DatePicker {...liveClear("confirmationDate", textFieldOptions)} />
                  </FormField>
                  <FormField label="Probation end date">
                    <DatePicker {...liveClear("probationEndDate", textFieldOptions)} />
                  </FormField>
                </>,
              )}

              <FormField label="Work location">
                <Input placeholder="e.g. Main Campus — A Block" {...liveClear("workLocation", textFieldOptions)} />
              </FormField>

              {fieldGrid(
                <>
                  <FormField label="Qualification">
                    <Select {...liveClear("qualification")}>
                      <option value="">Select qualification</option>
                      {QUALIFICATION_OPTIONS.map((q) => (
                        <option key={q} value={q}>
                          {q}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField label="Specialization">
                    <Input {...liveClear("specialization", textFieldOptions)} />
                  </FormField>
                </>,
              )}

              {fieldGrid(
                <>
                  <FormField label="Office room">
                    <Input placeholder="e.g. A Block · Room 218" {...liveClear("officeRoom", textFieldOptions)} />
                  </FormField>
                  <FormField label="Reporting to">
                    <Input {...liveClear("reportingTo", textFieldOptions)} />
                  </FormField>
                </>,
              )}
            </EditSectionCard>

            <EditSectionCard id="identity" title="Identity" desc="Access-controlled. Never shown on the faculty list or in exports." icon="verified_user" registerRef={registerSectionRef}>
              <div className="flex gap-3 rounded-admin-lg border border-admin-warning-border bg-admin-warning-bg p-4 text-sm text-admin-warning-fg">
                <Icon name="verified_user" size={20} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">Write-only</p>
                  <p className="mt-0.5">
                    The backend never returns these once saved, so the fields below always start blank — leave a field empty to keep its current value
                    unchanged, or fill it in to set/replace it.
                  </p>
                </div>
              </div>

              {fieldGrid(
                <>
                  <FormField label="Aadhaar number" hint="12 digits, no spaces." error={errors.aadhar_number?.message}>
                    <Input className={errors.aadhar_number ? "border-admin-danger" : undefined} {...liveClear("aadhar_number", textFieldOptions)} />
                  </FormField>
                  <FormField label="PAN" error={errors.pan_number?.message}>
                    <Input placeholder="ABCDE1234F" className={errors.pan_number ? "border-admin-danger" : undefined} {...liveClear("pan_number", textFieldOptions)} />
                  </FormField>
                </>,
              )}

              {fieldGrid(
                <>
                  <FormField label="Bank name">
                    <Input {...liveClear("bank_name", textFieldOptions)} />
                  </FormField>
                  <FormField label="Bank account number" error={errors.bank_account_number?.message}>
                    <Input className={errors.bank_account_number ? "border-admin-danger" : undefined} {...liveClear("bank_account_number", textFieldOptions)} />
                  </FormField>
                </>,
              )}

              <FormField label="IFSC code" error={errors.bank_ifsc?.message}>
                <Input placeholder="e.g. SBIN0007124" className={errors.bank_ifsc ? "border-admin-danger" : undefined} {...liveClear("bank_ifsc", textFieldOptions)} />
              </FormField>
            </EditSectionCard>

            <div className="rounded-admin-card border border-admin-danger-border bg-admin-canvas p-6">
              <div className="flex items-start justify-between gap-4 border-b border-admin-danger-border pb-5">
                <div>
                  <h3 className="text-lg font-bold text-admin-danger">Danger zone</h3>
                  <p className="mt-1 text-sm text-admin-muted">High-impact operations, applied immediately.</p>
                </div>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-admin-pill bg-admin-danger-bg text-admin-danger">
                  <Icon name="warning" size={18} />
                </span>
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-admin-lg border border-admin-danger-border bg-admin-danger-bg p-4">
                <div>
                  <p className="text-sm font-medium text-admin-danger-fg">{faculty.status === "active" ? "Deactivate faculty" : "Reactivate faculty"}</p>
                  <p className="text-xs text-admin-danger-fg">
                    {faculty.status === "active" ? "Revokes system access immediately." : "Restores system access immediately."}
                  </p>
                </div>
                <Button type="button" variant="danger" onClick={() => setStatusConfirmOpen(true)}>
                  {faculty.status === "active" ? "Deactivate" : "Reactivate"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </form>

      <ConfirmDialog
        open={cancelConfirmOpen}
        title="Discard unsaved changes?"
        message={`${unsavedCount} field${unsavedCount === 1 ? "" : "s"} modified. Leaving now discards those edits.`}
        confirmLabel="Discard and leave"
        destructive
        onConfirm={() => {
          clearDraft(draftKey);
          router.push(profileHref);
        }}
        onClose={() => setCancelConfirmOpen(false)}
      />

      <ConfirmDialog
        open={resetConfirmOpen}
        title="Reset the form?"
        message="All fields return to their last saved values."
        confirmLabel="Reset form"
        destructive
        onConfirm={confirmReset}
        onClose={() => setResetConfirmOpen(false)}
      />

      {faculty.status === "active" ? (
        <TypeToConfirmDialog
          open={statusConfirmOpen}
          title="Deactivate faculty"
          message={`Deactivating ${fullName(faculty)} revokes their portal access immediately. This can be undone later by reactivating them.`}
          confirmValue={fullName(faculty)}
          confirmLabel="Deactivate"
          isPending={isTogglingStatus}
          onConfirm={handleToggleStatus}
          onClose={() => setStatusConfirmOpen(false)}
        />
      ) : (
        <ConfirmDialog
          open={statusConfirmOpen}
          title="Reactivate faculty"
          message={`Reactivate ${fullName(faculty)}? Portal access will be restored.`}
          confirmLabel="Reactivate"
          isConfirming={isTogglingStatus}
          onConfirm={handleToggleStatus}
          onClose={() => setStatusConfirmOpen(false)}
        />
      )}

      <OtpVerifyDialog open={phoneOtpOpen} fieldLabel="mobile number" channel="sms" phoneNumber={phone ?? ""} onVerified={handlePhoneVerified} onClose={() => setPhoneOtpOpen(false)} />
    </div>
  );
}
