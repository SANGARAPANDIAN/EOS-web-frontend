"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import {
  Button,
  Checkbox,
  ConfirmDialog,
  DatePicker,
  FormField,
  Input,
  Modal,
  Select,
  Textarea,
  useToast,
} from "@/modules/admin/components/ui";
import { friendlyError } from "@/lib/utils/errors";
import { useBatches, useClasses, useCourses, useQuotas } from "@/modules/admin/api/refData";
import { avatarTint, initials } from "@/modules/admin/lib/students-format";
import {
  useDeleteStudentPhoto,
  useStudentEditProfile,
  useUpdateStudentAddresses,
  useUpdateStudentProfile,
  useUploadStudentPhoto,
  type StudentEditProfile,
  type UpdateStudentAddressesInput,
  type UpdateStudentProfileInput,
} from "@/modules/admin/api/students";

const GENDER_OPTIONS = ["Male", "Female", "Other"];
const BLOOD_GROUP_OPTIONS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];
const COMMUNITY_OPTIONS = ["OC", "BC", "MBC", "SC", "ST"];
const ADMISSION_TYPE_OPTIONS = ["Counselling", "Management", "Direct", "Lateral Entry"];

/**
 * These four fields are free-text columns in the DB (no CHECK constraint) —
 * the fixed lists above are just the values the admission wizard offers for
 * *new* entries. An existing record can carry an older/manually-entered value
 * outside that list (e.g. "CC" for community); silently defaulting the
 * select to the first option in that case would overwrite real data with the
 * wrong value the moment the form is saved. Always keep the record's actual
 * current value selectable, even when it's off-list.
 */
function optionsWithCurrent(options: string[], current: string): string[] {
  if (!current || options.includes(current)) return options;
  return [current, ...options];
}

// Mirrors AdminUpdateStudentDto exactly — every field here is real and
// writable via PATCH /students/:id today. Nothing shown that the backend
// can't actually persist.
interface FormState {
  roll_no: string;
  register_no: string;
  admission_no: string;
  admission_date: string;
  admission_type: string;
  joined_academic_year: string;
  gender: string;
  date_of_birth: string;
  student_type: "hosteller" | "dayscholar";
  dayscholar_mode: "" | "transport" | "own_vehicle";
  vehicle_number: string;
  course_id: string;
  quota_id: string;
  class_id: string;
  batch_id: string;
  status: "active" | "inactive";
  is_first_graduate: boolean;
  nationality: string;
  religion: string;
  community: string;
  caste: string;
  mother_tongue: string;
  blood_group: string;
  is_father_exserviceman: boolean;
  exserviceman_info: string;
  is_diff_abled: boolean;
  diff_abled_info: string;
  // Addresses aren't part of AdminUpdateStudentDto — they save through their
  // own PATCH /students/:id/addresses (see toAddressesPayload) — but live in
  // this same FormState so the modal has one "Save changes" action instead
  // of a second, confusing save button just for these eight fields.
  perm_address_line: string;
  perm_city: string;
  perm_state: string;
  perm_pincode: string;
  temp_address_line: string;
  temp_city: string;
  temp_state: string;
  temp_pincode: string;
}

function toFormState(p: StudentEditProfile): FormState {
  const perm = p.addresses.find((a) => a.address_type === "permanent");
  const temp = p.addresses.find((a) => a.address_type === "temporary");
  return {
    roll_no: p.roll_no ?? "",
    register_no: p.register_no ?? "",
    admission_no: p.admission_no ?? "",
    admission_date: p.admission_date ? p.admission_date.slice(0, 10) : "",
    admission_type: p.admission_type ?? "",
    joined_academic_year: p.joined_academic_year ?? "",
    gender: p.gender ?? "",
    date_of_birth: p.date_of_birth ? p.date_of_birth.slice(0, 10) : "",
    student_type: p.student_type,
    dayscholar_mode: p.dayscholar_mode ?? "",
    vehicle_number: p.vehicle_number ?? "",
    course_id: String(p.course_id),
    quota_id: String(p.quota_id),
    class_id: p.class_id ? String(p.class_id) : "",
    batch_id: String(p.batch_id),
    status: p.status,
    is_first_graduate: p.is_first_graduate,
    nationality: p.nationality ?? "",
    religion: p.religion ?? "",
    community: p.community ?? "",
    caste: p.caste ?? "",
    mother_tongue: p.mother_tongue ?? "",
    blood_group: p.blood_group ?? "",
    is_father_exserviceman: p.is_father_exserviceman,
    exserviceman_info: p.exserviceman_info ?? "",
    is_diff_abled: p.is_diff_abled,
    diff_abled_info: p.diff_abled_info ?? "",
    perm_address_line: perm?.address_line ?? "",
    perm_city: perm?.city ?? "",
    perm_state: perm?.state ?? "",
    perm_pincode: perm?.pincode ?? "",
    temp_address_line: temp?.address_line ?? "",
    temp_city: temp?.city ?? "",
    temp_state: temp?.state ?? "",
    temp_pincode: temp?.pincode ?? "",
  };
}

/** Same validation shape as the admission wizard — field-keyed error map, only the fields that actually have rules. */
function validate(form: FormState): Record<string, string> {
  const errors: Record<string, string> = {};
  if (form.joined_academic_year && !/^\d{4}-\d{4}$/.test(form.joined_academic_year)) {
    errors.joined_academic_year = "Format: YYYY-YYYY, e.g. 2026-2027.";
  }
  if (form.student_type === "dayscholar" && !form.dayscholar_mode) {
    errors.dayscholar_mode = "Required for a day scholar.";
  }
  if (form.dayscholar_mode === "own_vehicle" && !form.vehicle_number.trim()) {
    errors.vehicle_number = "Required when travelling by own vehicle.";
  }
  if (!form.course_id) errors.course_id = "Required.";
  if (!form.quota_id) errors.quota_id = "Required.";
  if (!form.batch_id) errors.batch_id = "Required.";
  // Same rule the admission wizard enforces for these same two fields.
  if (form.perm_pincode && !/^\d{6}$/.test(form.perm_pincode)) {
    errors.perm_pincode = "Exactly 6 digits.";
  }
  if (form.temp_pincode && !/^\d{6}$/.test(form.temp_pincode)) {
    errors.temp_pincode = "Exactly 6 digits.";
  }
  return errors;
}

function toPayload(form: FormState): UpdateStudentProfileInput {
  const str = (v: string) => v.trim() || undefined;
  return {
    roll_no: str(form.roll_no),
    register_no: str(form.register_no),
    admission_no: str(form.admission_no),
    admission_date: str(form.admission_date),
    admission_type: str(form.admission_type),
    joined_academic_year: str(form.joined_academic_year),
    gender: str(form.gender),
    date_of_birth: str(form.date_of_birth),
    student_type: form.student_type,
    dayscholar_mode: form.student_type === "dayscholar" && form.dayscholar_mode ? form.dayscholar_mode : undefined,
    vehicle_number: form.dayscholar_mode === "own_vehicle" ? str(form.vehicle_number) : undefined,
    course_id: Number(form.course_id),
    quota_id: Number(form.quota_id),
    // class_id has no "unassign" path through this endpoint — only send it
    // when a real class was picked.
    class_id: form.class_id ? Number(form.class_id) : undefined,
    batch_id: Number(form.batch_id),
    status: form.status,
    is_first_graduate: form.is_first_graduate,
    nationality: str(form.nationality),
    religion: str(form.religion),
    community: str(form.community),
    caste: str(form.caste),
    mother_tongue: str(form.mother_tongue),
    blood_group: str(form.blood_group),
    is_father_exserviceman: form.is_father_exserviceman,
    exserviceman_info: form.is_father_exserviceman ? str(form.exserviceman_info) : undefined,
    is_diff_abled: form.is_diff_abled,
    diff_abled_info: form.is_diff_abled ? str(form.diff_abled_info) : undefined,
  };
}

/**
 * Always sends both rows, even if entirely blank — a blank permanent
 * address here means "clear whatever was there before", which is a real,
 * intentional action (fixing a bad admission-time value), not something to
 * silently skip. The backend upserts by (student_id, address_type), so this
 * never creates duplicates.
 */
function toAddressesPayload(form: FormState): UpdateStudentAddressesInput {
  const str = (v: string) => v.trim() || undefined;
  return {
    addresses: [
      {
        address_type: "permanent",
        address_line: str(form.perm_address_line),
        city: str(form.perm_city),
        state: str(form.perm_state),
        pincode: str(form.perm_pincode),
      },
      {
        address_type: "temporary",
        address_line: str(form.temp_address_line),
        city: str(form.temp_city),
        state: str(form.temp_state),
        pincode: str(form.temp_pincode),
      },
    ],
  };
}

export function EditProfileModal({
  studentId,
  firstName,
  lastName,
  open,
  onClose,
}: {
  studentId: number;
  firstName: string | null;
  lastName: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const { show } = useToast();
  const { data: profile, isLoading: profileLoading } = useStudentEditProfile(studentId, open);
  const { data: courses } = useCourses();
  const { data: batches } = useBatches();
  const { data: quotas } = useQuotas();
  const { data: classes } = useClasses();
  const updateProfile = useUpdateStudentProfile();
  const updateAddresses = useUpdateStudentAddresses();
  const uploadPhoto = useUploadStudentPhoto();
  const deletePhoto = useDeleteStudentPhoto();
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Re-hydrate from the server's current values every time the modal opens
  // for a (possibly different) student — never carry stale edits across opens.
  // Deliberate one-shot hydration on open/data-arrival, not the kind of
  // external-sync setState the set-state-in-effect rule is meant to flag.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open && profile) setForm(toFormState(profile));
    if (!open) {
      setForm(null);
      setErrors({});
    }
  }, [open, profile]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function patch(p: Partial<FormState>) {
    setForm((f) => (f ? { ...f, ...p } : f));
  }

  async function handleSave() {
    if (!form) return;
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      await Promise.all([
        updateProfile.mutateAsync({ id: studentId, input: toPayload(form) }),
        updateAddresses.mutateAsync({ id: studentId, input: toAddressesPayload(form) }),
      ]);
      show("Profile updated.", "success");
      onClose();
    } catch (err) {
      show(friendlyError(err), "error");
    }
  }

  async function handlePhotoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      await uploadPhoto.mutateAsync({ id: studentId, file });
      show("Photo updated.", "success");
    } catch (err) {
      show(friendlyError(err), "error");
    }
  }

  async function handleDeletePhoto() {
    try {
      await deletePhoto.mutateAsync(studentId);
      show("Photo removed.", "success");
      setConfirmDelete(false);
    } catch (err) {
      show(friendlyError(err), "error");
    }
  }

  // Filtered to the selected course so the list stays short and relevant —
  // but if the student's currently-assigned class belongs to a different
  // course (a data inconsistency, not something this form should silently
  // paper over), keep it selectable rather than making the dropdown show a
  // blank "Unassigned" for a class that's actually still assigned.
  const classOptionsForCourse = (classes ?? []).filter(
    (c) => !form || c.course_id === Number(form.course_id) || String(c.id) === form.class_id,
  );

  return (
    <>
      <Modal open={open} onClose={onClose} title="Edit profile" widthClassName="max-w-3xl">
        {profileLoading || !form ? (
          <p className="py-8 text-center text-sm text-admin-subtle">Loading current values…</p>
        ) : (
          <div className="flex flex-col gap-6">
            <div>
              <p className="mb-3 text-xs font-semibold tracking-wide text-admin-subtle uppercase">Profile photo</p>
              <div className="flex items-center gap-4">
                {(() => {
                  const tint = avatarTint(studentId);
                  return (
                    <span
                      className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-admin-lg border border-admin-border text-xl font-semibold"
                      style={profile?.photo_url ? undefined : { background: tint.bg, color: tint.fg }}
                    >
                      {profile?.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element -- a Supabase Storage URL, not a local/optimizable asset
                        <img src={profile.photo_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        initials(firstName, lastName)
                      )}
                    </span>
                  );
                })()}
                <div className="flex flex-col gap-2">
                  <input ref={photoInputRef} type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={handlePhotoFile} />
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" size="sm" disabled={uploadPhoto.isPending} onClick={() => photoInputRef.current?.click()}>
                      <Icon name="upload" size={15} /> {profile?.photo_url ? "Replace photo" : "Upload photo"}
                    </Button>
                    {profile?.photo_url && (
                      <Button type="button" variant="secondary" size="sm" onClick={() => setConfirmDelete(true)}>
                        <Icon name="delete" size={15} /> Remove
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-admin-subtle">JPG, PNG or WebP, up to 5MB.</p>
                </div>
              </div>
            </div>

            <div>
              <p className="mb-3 text-xs font-semibold tracking-wide text-admin-subtle uppercase">Identity numbers</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <FormField label="Roll number">
                  <Input value={form.roll_no} maxLength={30} onChange={(e) => patch({ roll_no: e.target.value })} />
                </FormField>
                <FormField label="Register number">
                  <Input value={form.register_no} maxLength={30} onChange={(e) => patch({ register_no: e.target.value })} />
                </FormField>
                <FormField label="Admission number">
                  <Input value={form.admission_no} maxLength={30} onChange={(e) => patch({ admission_no: e.target.value })} />
                </FormField>
              </div>
            </div>

            <div>
              <p className="mb-3 text-xs font-semibold tracking-wide text-admin-subtle uppercase">Academic placement</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <FormField label="Course" error={errors.course_id}>
                  <Select
                    value={form.course_id}
                    className={errors.course_id ? "border-admin-danger" : undefined}
                    onChange={(e) => patch({ course_id: e.target.value, class_id: "" })}
                  >
                    <option value="">Select course</option>
                    {courses?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} — {c.name}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Batch" error={errors.batch_id}>
                  <Select value={form.batch_id} className={errors.batch_id ? "border-admin-danger" : undefined} onChange={(e) => patch({ batch_id: e.target.value })}>
                    <option value="">Select batch</option>
                    {batches?.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Quota" error={errors.quota_id}>
                  <Select value={form.quota_id} className={errors.quota_id ? "border-admin-danger" : undefined} onChange={(e) => patch({ quota_id: e.target.value })}>
                    <option value="">Select quota</option>
                    {quotas?.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.name}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Class section">
                  <Select value={form.class_id} onChange={(e) => patch({ class_id: e.target.value })} disabled={!form.course_id}>
                    <option value="">Unassigned</option>
                    {classOptionsForCourse.map((c) => (
                      <option key={c.id} value={c.id}>
                        Section {c.section}
                        {c.current_semester ? ` · Sem ${c.current_semester}` : ""}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Status">
                  <Select value={form.status} onChange={(e) => patch({ status: e.target.value as FormState["status"] })}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </Select>
                </FormField>
                <FormField label="Admission date">
                  <DatePicker value={form.admission_date} onChange={(e) => patch({ admission_date: e.target.value })} />
                </FormField>
                <FormField label="Admission type">
                  <Select value={form.admission_type} onChange={(e) => patch({ admission_type: e.target.value })}>
                    <option value="">Select type</option>
                    {optionsWithCurrent(ADMISSION_TYPE_OPTIONS, form.admission_type).map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Joined academic year" error={errors.joined_academic_year}>
                  <Input
                    value={form.joined_academic_year}
                    placeholder="2026-2027"
                    className={errors.joined_academic_year ? "border-admin-danger" : undefined}
                    onChange={(e) => patch({ joined_academic_year: e.target.value })}
                  />
                </FormField>
              </div>
            </div>

            <div>
              <p className="mb-3 text-xs font-semibold tracking-wide text-admin-subtle uppercase">Personal details</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <FormField label="Gender">
                  <Select value={form.gender} onChange={(e) => patch({ gender: e.target.value })}>
                    <option value="">Select gender</option>
                    {optionsWithCurrent(GENDER_OPTIONS, form.gender).map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Date of birth">
                  <DatePicker value={form.date_of_birth} onChange={(e) => patch({ date_of_birth: e.target.value })} />
                </FormField>
                <FormField label="Blood group">
                  <Select value={form.blood_group} onChange={(e) => patch({ blood_group: e.target.value })}>
                    <option value="">Select blood group</option>
                    {optionsWithCurrent(BLOOD_GROUP_OPTIONS, form.blood_group).map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Community">
                  <Select value={form.community} onChange={(e) => patch({ community: e.target.value })}>
                    <option value="">Select community</option>
                    {optionsWithCurrent(COMMUNITY_OPTIONS, form.community).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Nationality">
                  <Input value={form.nationality} maxLength={50} placeholder="Indian" onChange={(e) => patch({ nationality: e.target.value })} />
                </FormField>
                <FormField label="Religion">
                  <Input value={form.religion} maxLength={50} onChange={(e) => patch({ religion: e.target.value })} />
                </FormField>
                <FormField label="Caste">
                  <Input value={form.caste} maxLength={50} onChange={(e) => patch({ caste: e.target.value })} />
                </FormField>
                <FormField label="Mother tongue">
                  <Input value={form.mother_tongue} maxLength={50} placeholder="Tamil" onChange={(e) => patch({ mother_tongue: e.target.value })} />
                </FormField>
              </div>
            </div>

            <div>
              <p className="mb-3 text-xs font-semibold tracking-wide text-admin-subtle uppercase">Residence</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <FormField label="Residence type">
                  <Select
                    value={form.student_type}
                    onChange={(e) =>
                      patch({
                        student_type: e.target.value as FormState["student_type"],
                        dayscholar_mode: e.target.value === "hosteller" ? "" : form.dayscholar_mode,
                      })
                    }
                  >
                    <option value="hosteller">Hosteller</option>
                    <option value="dayscholar">Day scholar</option>
                  </Select>
                </FormField>
                {form.student_type === "dayscholar" && (
                  <FormField label="How they travel" error={errors.dayscholar_mode}>
                    <Select
                      value={form.dayscholar_mode}
                      className={errors.dayscholar_mode ? "border-admin-danger" : undefined}
                      onChange={(e) => patch({ dayscholar_mode: e.target.value as FormState["dayscholar_mode"] })}
                    >
                      <option value="">Select mode</option>
                      <option value="transport">College transport</option>
                      <option value="own_vehicle">Own vehicle</option>
                    </Select>
                  </FormField>
                )}
                {form.dayscholar_mode === "own_vehicle" && (
                  <FormField label="Vehicle number" error={errors.vehicle_number}>
                    <Input
                      value={form.vehicle_number}
                      maxLength={30}
                      placeholder="TN 37 CX 1234"
                      className={errors.vehicle_number ? "border-admin-danger" : undefined}
                      onChange={(e) => patch({ vehicle_number: e.target.value })}
                    />
                  </FormField>
                )}
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold tracking-wide text-admin-subtle uppercase">Permanent address</p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Address">
                  <Textarea value={form.perm_address_line} maxLength={500} rows={2} onChange={(e) => patch({ perm_address_line: e.target.value })} />
                </FormField>
                <FormField label="City">
                  <Input value={form.perm_city} maxLength={100} onChange={(e) => patch({ perm_city: e.target.value })} />
                </FormField>
                <FormField label="State">
                  <Input value={form.perm_state} maxLength={100} placeholder="Tamil Nadu" onChange={(e) => patch({ perm_state: e.target.value })} />
                </FormField>
                <FormField label="PIN code" error={errors.perm_pincode}>
                  <Input
                    value={form.perm_pincode}
                    maxLength={6}
                    placeholder="641062"
                    className={errors.perm_pincode ? "border-admin-danger" : undefined}
                    onChange={(e) => patch({ perm_pincode: e.target.value })}
                  />
                </FormField>
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold tracking-wide text-admin-subtle uppercase">Temporary address</p>
                <button
                  type="button"
                  className="text-xs font-medium text-admin-primary hover:underline"
                  onClick={() =>
                    patch({
                      temp_address_line: form.perm_address_line,
                      temp_city: form.perm_city,
                      temp_state: form.perm_state,
                      temp_pincode: form.perm_pincode,
                    })
                  }
                >
                  Same as permanent
                </button>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Address">
                  <Textarea value={form.temp_address_line} maxLength={500} rows={2} onChange={(e) => patch({ temp_address_line: e.target.value })} />
                </FormField>
                <FormField label="City">
                  <Input value={form.temp_city} maxLength={100} onChange={(e) => patch({ temp_city: e.target.value })} />
                </FormField>
                <FormField label="State">
                  <Input value={form.temp_state} maxLength={100} onChange={(e) => patch({ temp_state: e.target.value })} />
                </FormField>
                <FormField label="PIN code" error={errors.temp_pincode}>
                  <Input
                    value={form.temp_pincode}
                    maxLength={6}
                    placeholder="641062"
                    className={errors.temp_pincode ? "border-admin-danger" : undefined}
                    onChange={(e) => patch({ temp_pincode: e.target.value })}
                  />
                </FormField>
              </div>
            </div>

            <div>
              <p className="mb-3 text-xs font-semibold tracking-wide text-admin-subtle uppercase">Special categories</p>
              <div className="flex flex-col gap-3">
                <label className="flex items-center gap-2 text-sm text-admin-body">
                  <Checkbox checked={form.is_first_graduate} onChange={(e) => patch({ is_first_graduate: e.target.checked })} />
                  First graduate in the family
                </label>
                <label className="flex items-center gap-2 text-sm text-admin-body">
                  <Checkbox checked={form.is_father_exserviceman} onChange={(e) => patch({ is_father_exserviceman: e.target.checked })} />
                  Father is an ex-serviceman
                </label>
                {form.is_father_exserviceman && (
                  <Input
                    value={form.exserviceman_info}
                    maxLength={255}
                    placeholder="Service details"
                    onChange={(e) => patch({ exserviceman_info: e.target.value })}
                  />
                )}
                <label className="flex items-center gap-2 text-sm text-admin-body">
                  <Checkbox checked={form.is_diff_abled} onChange={(e) => patch({ is_diff_abled: e.target.checked })} />
                  Differently abled
                </label>
                {form.is_diff_abled && (
                  <Input value={form.diff_abled_info} maxLength={255} placeholder="Details" onChange={(e) => patch({ diff_abled_info: e.target.value })} />
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-admin-divider pt-4">
              <Button variant="secondary" onClick={onClose} disabled={updateProfile.isPending || updateAddresses.isPending}>
                Cancel
              </Button>
              <Button variant="primary" disabled={updateProfile.isPending || updateAddresses.isPending} onClick={handleSave}>
                {updateProfile.isPending || updateAddresses.isPending ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Sibling, not nested inside <Modal> — two native <dialog> elements
        open at once behave correctly as siblings; nesting one inside the
        other's DOM subtree makes the browser close both when the inner one
        closes. */}
      <ConfirmDialog
        open={confirmDelete}
        title="Remove photo?"
        message="This deletes the current profile photo from storage. The student will show initials until a new one is uploaded."
        confirmLabel="Remove photo"
        destructive
        isConfirming={deletePhoto.isPending}
        onConfirm={handleDeletePhoto}
        onClose={() => setConfirmDelete(false)}
      />
    </>
  );
}
