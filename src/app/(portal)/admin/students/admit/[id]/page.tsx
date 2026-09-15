"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { friendlyError } from "@/lib/utils/errors";
import { Button, PageHeader, useToast } from "@/modules/admin/components/ui";
import { useBatches, useCourses, useQuotas } from "@/modules/admin/api/refData";
import { useDepartments } from "@/modules/shared/api/departments";
import {
  useCertificateTypes,
  useHostelRoomTypes,
  usePerfectEntry,
  useProfileDraft,
  useSaveProfileDraft,
  useSoaApplication,
  useTransportStages,
  useUpdateSoaStatus,
  type PerfectEntryResult,
} from "@/modules/admin/api/admissions";
import { WIZARD_CATEGORIES, type Category } from "@/modules/admin/config/admissionWizardSections";
import {
  buildPerfectEntryPayload,
  categoryStats,
  liveFields,
  validateField,
  vkey,
  type LookupOptions,
} from "@/modules/admin/lib/admission-wizard";
import {
  CategoryForm,
  CategoryHead,
  CertificateChecklistPanel,
  DisabledStub,
  FooterBar,
  PhotoPicker,
  ProgressBar,
  Rail,
  RepeatPanel,
  ReviewPanel,
} from "@/modules/admin/components/admission-wizard";

const PROFILE_CATEGORIES = WIZARD_CATEGORIES.filter((c) => c.id !== "application");
const DATA_CATEGORIES = PROFILE_CATEGORIES.filter((c) => !c.review);
const REVIEW_CATEGORY = PROFILE_CATEGORIES.find((c) => c.review)!;

export default function CompleteProfilePage() {
  const params = useParams<{ id: string }>();
  const applicationId = Number(params.id);
  const { show } = useToast();
  const { data: application, isLoading, isError } = useSoaApplication(applicationId);
  const updateStatus = useUpdateSoaStatus();
  // Set the instant perfect-entry succeeds, checked before application.students
  // below — see ProfileWizard's onComplete prop docblock for why this can't
  // just be a local state further down the tree.
  const [justCompleted, setJustCompleted] = useState<PerfectEntryResult | null>(null);
  const [passwordCopied, setPasswordCopied] = useState(false);

  if (isLoading) {
    return <p className="text-sm text-admin-muted">Loading application…</p>;
  }

  if (isError || !application) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-admin-card border border-admin-danger-border bg-admin-danger-bg p-6 text-sm text-admin-danger-fg">
          This application doesn&apos;t exist, or was deleted.
        </div>
        <Link href="/admin/students/admit" className="mt-4 inline-block">
          <Button variant="secondary">
            <Icon name="arrow_back" size={16} /> Back to the pipeline
          </Button>
        </Link>
      </div>
    );
  }

  const crumb = (
    <nav className="mb-3 flex items-center gap-1.5 text-sm text-admin-muted">
      <Link href="/admin/dashboard" className="hover:text-admin-body">
        Home
      </Link>
      <Icon name="chevron_right" size={15} />
      <Link href="/admin/students" className="hover:text-admin-body">
        Students
      </Link>
      <Icon name="chevron_right" size={15} />
      <Link href="/admin/students/admit" className="hover:text-admin-body">
        Admission applications
      </Link>
      <Icon name="chevron_right" size={15} />
      <span className="font-semibold text-admin-body">
        {application.first_name} {application.last_name ?? ""}
      </span>
    </nav>
  );

  async function copyPassword() {
    if (!justCompleted) return;
    try {
      await navigator.clipboard.writeText(justCompleted.password);
      setPasswordCopied(true);
      setTimeout(() => setPasswordCopied(false), 2000);
    } catch {
      show("Couldn't copy — select and copy the password manually.", "error");
    }
  }

  // Checked BEFORE application.students below, and takes priority when both
  // are true — see ProfileWizard's onComplete prop docblock for why: without
  // this, the background refetch that invalidateQueries triggers would swap
  // in the plain "already completed" branch (no password) the instant it
  // resolves, possibly before the admin has read or copied it.
  if (justCompleted) {
    return (
      <div className="mx-auto max-w-2xl">
        {crumb}
        <div className="rounded-admin-card border border-admin-success-border bg-admin-success-bg p-6">
          <div className="flex items-center gap-2 text-admin-success-fg">
            <Icon name="check" size={20} />
            <h1 className="text-lg font-bold">Admission confirmed</h1>
          </div>
          <p className="mt-2 text-sm text-admin-success-fg">
            Student ID <strong>{justCompleted.student_id_no}</strong> was created (internal id #{justCompleted.id}).
          </p>

          <div className="mt-4 flex items-center gap-2 rounded-admin-md border border-admin-border bg-admin-canvas px-3 py-2.5">
            <Icon name="lock" size={16} className="shrink-0 text-admin-muted" />
            <code className="flex-1 select-all break-all font-mono text-sm text-admin-ink">{justCompleted.password}</code>
            <button
              type="button"
              onClick={copyPassword}
              title="Copy to clipboard"
              className="shrink-0 rounded-admin-sm p-1.5 text-admin-muted hover:bg-admin-tint-strong"
            >
              <Icon name={passwordCopied ? "check" : "content_copy"} size={16} />
            </button>
          </div>

          <div
            className={`mt-3 rounded-admin-md border p-3 text-sm ${
              justCompleted.sms.sent
                ? "border-admin-success-border bg-admin-success-bg text-admin-success-fg"
                : "border-admin-warning-border bg-admin-warning-bg text-admin-warning-fg"
            }`}
          >
            <div className="flex gap-2">
              <Icon name={justCompleted.sms.sent ? "send" : "warning"} size={16} className="mt-0.5 shrink-0" />
              <p>
                {justCompleted.sms.sent
                  ? "This password was texted to the student's phone."
                  : `${justCompleted.sms.note} Copy the password above and hand it to the student directly. If they lose it later, use Reset Password from their profile.`}
              </p>
            </div>
          </div>

          <div className="mt-5 flex gap-2">
            <Link href={`/admin/students/${justCompleted.id}`}>
              <Button variant="primary">View student profile</Button>
            </Link>
            <Link href="/admin/students/admit">
              <Button variant="secondary">Back to the pipeline</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (application.students) {
    return (
      <div className="mx-auto max-w-2xl">
        {crumb}
        <div className="rounded-admin-card border border-admin-success-border bg-admin-success-bg p-6">
          <div className="flex items-center gap-2 text-admin-success-fg">
            <Icon name="check" size={20} />
            <h1 className="text-lg font-bold">Profile already completed</h1>
          </div>
          <p className="mt-2 text-sm text-admin-success-fg">
            Student ID <strong>{application.students.student_id_no}</strong> was created from this application.
          </p>
          <div className="mt-5 flex gap-2">
            <Link href={`/admin/students/${application.students.id}`}>
              <Button variant="primary">View student profile</Button>
            </Link>
            <Link href="/admin/students/admit">
              <Button variant="secondary">Back to the pipeline</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (application.status !== "admission_confirmed") {
    const nextStatus = application.status === "applied" ? "fees_paid" : "admission_confirmed";
    const nextLabel = application.status === "applied" ? "Mark fees paid" : "Confirm admission";
    const canAdvance = application.status === "applied" || application.status === "fees_paid";

    return (
      <div className="mx-auto max-w-2xl">
        {crumb}
        <div className="rounded-admin-card border border-admin-warning-border bg-admin-warning-bg p-6">
          <div className="flex items-center gap-2 text-admin-warning-fg">
            <Icon name="warning" size={20} />
            <h1 className="text-lg font-bold">Profile completion isn&apos;t open yet</h1>
          </div>
          <p className="mt-2 text-sm text-admin-warning-fg">
            This application is currently <strong>{application.status.replace("_", " ")}</strong>. The rest of the
            student&apos;s profile (identity, programme, personal details, and everything else) can only be filled in
            once the application reaches <strong>admission confirmed</strong>.
          </p>
          <div className="mt-5 flex gap-2">
            {canAdvance && (
              <Button
                variant="primary"
                disabled={updateStatus.isPending}
                onClick={async () => {
                  try {
                    await updateStatus.mutateAsync({ id: application.id, status: nextStatus });
                    show(`Moved to ${nextStatus.replace("_", " ")}.`, "success");
                  } catch (err) {
                    show(friendlyError(err), "error");
                  }
                }}
              >
                {updateStatus.isPending ? "Saving…" : nextLabel}
              </Button>
            )}
            <Link href="/admin/students/admit">
              <Button variant="secondary">Back to the pipeline</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <ProfileWizard applicationId={applicationId} crumb={crumb} onComplete={setJustCompleted} />;
}

function ProfileWizard({
  applicationId,
  crumb,
  onComplete,
}: {
  applicationId: number;
  crumb: React.ReactNode;
  /**
   * Reports success up to CompleteProfilePage instead of this component
   * showing its own success screen — usePerfectEntry's onSuccess
   * invalidates the soa-applications detail query, and that refetch
   * resolving would otherwise unmount this whole component (the parent's
   * `application.students` check would flip and swap in its own "already
   * completed" branch) mid-flash, taking the one-time password reveal with
   * it before the admin has a chance to read/copy it.
   */
  onComplete: (result: PerfectEntryResult) => void;
}) {
  const { show } = useToast();
  const [current, setCurrent] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [marks, setMarks] = useState<string[]>([""]);

  const { data: departments } = useDepartments();
  const { data: courses } = useCourses();
  const { data: quotas } = useQuotas();
  const { data: batches } = useBatches();
  const { data: transportStages } = useTransportStages(true);
  const { data: hostelRoomTypes } = useHostelRoomTypes(true);
  const { data: certificateTypes } = useCertificateTypes(true);
  const certificateTypeIds = useMemo(() => certificateTypes?.map((t) => t.id) ?? [], [certificateTypes]);

  const perfectEntry = usePerfectEntry();
  const isSubmitting = perfectEntry.isPending;

  // Draft resume: loaded once per mount, then applied to local state exactly
  // once (draftAppliedRef) so it can never clobber the admin's own edits on
  // a later refetch — this is a one-shot "restore where I left off", not a
  // live sync.
  const { data: draft, isLoading: draftLoading } = useProfileDraft(applicationId, true);
  const saveDraft = useSaveProfileDraft();
  const draftAppliedRef = useRef(false);

  // One-shot hydration of local editable state from an async-loaded resource
  // (draftAppliedRef guarantees this body runs at most once per mount) — not
  // the ongoing React/external-system sync the set-state-in-effect rule is
  // meant to catch, so it's deliberately silenced for this whole effect body.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (draftAppliedRef.current || draftLoading) return;
    draftAppliedRef.current = true;
    if (!draft) return;
    setValues(draft.values);
    setMarks(draft.marks.length ? draft.marks : [""]);
    setSaved(new Set(draft.saved_categories));
    const firstUnsaved = DATA_CATEGORIES.findIndex((c) => !draft.saved_categories.includes(c.id));
    setCurrent(firstUnsaved === -1 ? DATA_CATEGORIES.length : firstUnsaved);
    show("Resumed from where you left off.", "success");
  }, [draft, draftLoading, show]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function persistDraft(nextSaved: Set<string>, nextValues: Record<string, string>, nextMarks: string[]) {
    saveDraft.mutate({
      id: applicationId,
      input: { values: nextValues, marks: nextMarks, saved_categories: Array.from(nextSaved) },
    });
  }

  const lookupOptions: LookupOptions = useMemo(() => {
    const selectedDept = values[vkey("placement", "department")];
    const filteredCourses = selectedDept ? (courses ?? []).filter((c) => String(c.department_id) === selectedDept) : courses ?? [];
    return {
      department: (departments ?? []).map((d) => ({ value: String(d.id), label: d.name })),
      course: filteredCourses.map((c) => ({ value: String(c.id), label: `${c.name} (${c.code})` })),
      quota: (quotas ?? []).map((q) => ({ value: String(q.id), label: q.name })),
      batch: (batches ?? []).map((b) => ({ value: String(b.id), label: b.name })),
      transportStage: (transportStages ?? []).map((t) => ({ value: String(t.id), label: t.stage_name })),
      hostelRoomType: (hostelRoomTypes ?? []).map((h) => ({ value: String(h.id), label: h.name })),
    };
  }, [values, departments, courses, quotas, batches, transportStages, hostelRoomTypes]);

  const setValue = (categoryId: string, fieldKey: string, val: string, clears: string[] = []) => {
    setValues((v) => {
      const next = { ...v, [vkey(categoryId, fieldKey)]: val };
      clears.forEach((k) => delete next[vkey(categoryId, k)]);
      return next;
    });
    setErrors((e) => {
      const k = vkey(categoryId, fieldKey);
      if (!e[k]) return e;
      const next = { ...e };
      delete next[k];
      return next;
    });
  };

  const category = current < DATA_CATEGORIES.length ? DATA_CATEGORIES[current] : REVIEW_CATEGORY;
  const isReview = category.review === true;

  function goTo(index: number) {
    setCurrent(Math.max(0, Math.min(PROFILE_CATEGORIES.length - 1, index)));
  }

  function validateCategory(cat: Category): Record<string, string> {
    const out: Record<string, string> = {};
    liveFields(cat, values).forEach((f) => {
      const raw = values[vkey(cat.id, f.key)] ?? f.defaultValue ?? "";
      const msg = validateField(f, raw);
      if (msg) out[vkey(cat.id, f.key)] = msg;
    });
    return out;
  }

  function saveCategoryAndAdvance() {
    const catErrors = validateCategory(category);
    if (Object.keys(catErrors).length) {
      setErrors((e) => ({ ...e, ...catErrors }));
      show(`${Object.keys(catErrors).length} field(s) need attention.`, "error");
      return;
    }
    const nextSaved = new Set(saved).add(category.id);
    setSaved(nextSaved);
    persistDraft(nextSaved, values, marks);
    goTo(current + 1);
  }

  // Skipping still leaves the category unsaved (matches the existing "not
  // saved" semantics in the Rail/Review), but whatever was typed into it —
  // and every other category's progress so far — is still worth keeping if
  // the admin closes the tab right after.
  function skipCategory() {
    persistDraft(saved, values, marks);
    goTo(current + 1);
  }

  function allValidationErrors(): { categoryId: string; errors: Record<string, string> }[] {
    return DATA_CATEGORIES.filter((c) => !c.repeat && !c.disabledStub).map((c) => ({
      categoryId: c.id,
      errors: validateCategory(c),
    }));
  }

  async function handleConfirm() {
    const perCategory = allValidationErrors();
    const firstBad = perCategory.find((c) => Object.keys(c.errors).length > 0);
    if (firstBad) {
      setErrors((e) => ({ ...e, ...firstBad.errors }));
      const idx = DATA_CATEGORIES.findIndex((c) => c.id === firstBad.categoryId);
      goTo(idx);
      show("Some required fields still need attention.", "error");
      return;
    }

    try {
      const student = await perfectEntry.mutateAsync({
        id: applicationId,
        input: buildPerfectEntryPayload(values, marks, certificateTypeIds),
      });
      // Handled by the parent (CompleteProfilePage), not local state here —
      // see onComplete's own docblock for why.
      onComplete(student);
      show("Profile completed.", "success");
    } catch (err) {
      show(friendlyError(err), "error");
    }
  }

  if (draftLoading) {
    return (
      <div>
        {crumb}
        <p className="text-sm text-admin-muted">Checking for saved progress…</p>
      </div>
    );
  }

  return (
    <div>
      {crumb}

      <PageHeader
        title="Complete the profile"
        description="Thirteen categories, one confirmation. Fields the backend doesn't yet write are shown disabled with an honest note instead of being hidden."
        actions={
          <Link href="/admin/students/admit">
            <Button variant="secondary">
              <Icon name="arrow_back" size={16} /> Back to the pipeline
            </Button>
          </Link>
        }
      />

      <ProgressBar current={current} categories={PROFILE_CATEGORIES} dataCategoryCount={DATA_CATEGORIES.length} saved={saved} isSavingDraft={saveDraft.isPending} />

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
        <Rail
          categories={PROFILE_CATEGORIES}
          current={current}
          values={values}
          marks={marks}
          saved={saved}
          certificateTypeIds={certificateTypeIds}
          onSelect={goTo}
        />

        <div className="rounded-admin-card border border-admin-border bg-admin-canvas">
          <CategoryHead category={category} />
          <div className="border-t border-admin-divider p-5">
            {category.id === "identity" && (
              <PhotoPicker
                applicationId={applicationId}
                photoUrl={values[vkey("identity", "photo_url")]}
                onUploaded={(url) => setValue("identity", "photo_url", url)}
              />
            )}
            {isReview ? (
              <ReviewPanel
                dataCategories={DATA_CATEGORIES}
                values={values}
                marks={marks}
                saved={saved}
                onJump={goTo}
                onConfirm={handleConfirm}
                isSubmitting={isSubmitting}
              />
            ) : category.disabledStub ? (
              <DisabledStub reason={category.disabledStub} />
            ) : category.repeat ? (
              <RepeatPanel spec={category.repeat} marks={marks} setMarks={setMarks} />
            ) : category.checklist ? (
              <CertificateChecklistPanel applicationId={applicationId} category={category} values={values} setValue={setValue} />
            ) : (
              <CategoryForm category={category} values={values} errors={errors} lookupOptions={lookupOptions} setValue={setValue} />
            )}
          </div>
          {!isReview && (
            <FooterBar
              current={current}
              category={category}
              stats={categoryStats(category, values, marks, certificateTypeIds)}
              saved={saved.has(category.id)}
              onBack={() => goTo(current - 1)}
              onSkip={skipCategory}
              onSave={saveCategoryAndAdvance}
              isLast={current === PROFILE_CATEGORIES.length - 2}
            />
          )}
        </div>
      </div>
    </div>
  );
}
