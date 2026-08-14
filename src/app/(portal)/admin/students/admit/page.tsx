"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { friendlyError } from "@/lib/utils/errors";
import {
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  FilterBar,
  FilterPill,
  Input,
  Modal,
  Pagination,
  PageHeader,
  Select,
  useToast,
  type DataTableColumn,
} from "@/modules/admin/components/ui";
import {
  useCreateSoaApplication,
  useDeleteSoaApplication,
  useSoaApplications,
  useUpdateSoaApplication,
  useUpdateSoaStatus,
  type CreateSoaApplicationInput,
  type SoaApplicationDetail,
  type SoaStatus,
} from "@/modules/admin/api/admissions";
import { WIZARD_CATEGORIES } from "@/modules/admin/config/admissionWizardSections";

// The community column (soa_applications/students) is free-text in the DB, but
// this is the one fixed list used elsewhere in the reference UI (student-edit.js).
const COMMUNITY_OPTIONS = ["OC", "BC", "MBC", "SC", "ST"];

// Same filter the Complete Profile wizard uses to count its data categories
// (excludes the synthetic "application" and final review steps), so the
// dashboard's "N of X saved" progress always matches the wizard exactly.
const DRAFT_CATEGORY_COUNT = WIZARD_CATEGORIES.filter((c) => c.id !== "application" && !c.review).length;

// "Draft" isn't a real soa_status_enum value — it's a derived view (admission
// confirmed, no student row yet, but a Complete Profile draft in progress).
// Handled as a distinct tab state rather than a SoaStatus.
const DRAFT_TAB = "draft" as const;

const STATUS_TABS: Array<{ value: SoaStatus | "all" | typeof DRAFT_TAB; label: string }> = [
  { value: "all", label: "All" },
  { value: "applied", label: "Applied" },
  { value: "fees_paid", label: "Fees paid" },
  { value: "admission_confirmed", label: "Admission confirmed" },
  { value: DRAFT_TAB, label: "Draft" },
  { value: "cancelled", label: "Cancelled / declined" },
];

const STATUS_TONE: Record<SoaStatus, "primary" | "warning" | "success" | "danger"> = {
  applied: "primary",
  fees_paid: "warning",
  admission_confirmed: "success",
  cancelled: "danger",
};

const STATUS_LABEL: Record<SoaStatus, string> = {
  applied: "Applied",
  fees_paid: "Fees paid",
  admission_confirmed: "Admission confirmed",
  cancelled: "Cancelled",
};

interface ApplicationFormState {
  first_name: string;
  last_name: string;
  father_name: string;
  mother_name: string;
  parent_contact: string;
  student_contact: string;
  student_whatsapp: string;
  student_email: string;
  cutoff_physics: string;
  cutoff_chemistry: string;
  cutoff_maths: string;
  community: string;
}

const EMPTY_FORM: ApplicationFormState = {
  first_name: "",
  last_name: "",
  father_name: "",
  mother_name: "",
  parent_contact: "",
  student_contact: "",
  student_whatsapp: "",
  student_email: "",
  cutoff_physics: "",
  cutoff_chemistry: "",
  cutoff_maths: "",
  community: "",
};

function toFormState(app: SoaApplicationDetail): ApplicationFormState {
  return {
    first_name: app.first_name,
    last_name: app.last_name ?? "",
    father_name: app.father_name ?? "",
    mother_name: app.mother_name ?? "",
    parent_contact: app.parent_contact ?? "",
    student_contact: app.student_contact ?? "",
    student_whatsapp: app.student_whatsapp ?? "",
    student_email: app.student_email ?? "",
    cutoff_physics: app.cutoff_physics ?? "",
    cutoff_chemistry: app.cutoff_chemistry ?? "",
    cutoff_maths: app.cutoff_maths ?? "",
    community: app.community ?? "",
  };
}

function toPayload(form: ApplicationFormState): CreateSoaApplicationInput {
  const num = (v: string) => (v.trim() ? Number(v) : undefined);
  return {
    first_name: form.first_name.trim(),
    last_name: form.last_name.trim() || undefined,
    father_name: form.father_name.trim() || undefined,
    mother_name: form.mother_name.trim() || undefined,
    parent_contact: form.parent_contact.trim() || undefined,
    student_contact: form.student_contact.trim() || undefined,
    student_whatsapp: form.student_whatsapp.trim() || undefined,
    student_email: form.student_email.trim() || undefined,
    cutoff_physics: num(form.cutoff_physics),
    cutoff_chemistry: num(form.cutoff_chemistry),
    cutoff_maths: num(form.cutoff_maths),
    community: form.community.trim() || undefined,
  };
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium text-admin-ink">
        {label}
        {required && <span className="ml-0.5 text-admin-danger">*</span>}
      </label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function ApplicationFormFields({
  form,
  onChange,
}: {
  form: ApplicationFormState;
  onChange: (patch: Partial<ApplicationFormState>) => void;
}) {
  const field = (key: keyof ApplicationFormState) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange({ [key]: e.target.value } as never),
  });
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="First name" required>
        <Input {...field("first_name")} placeholder="Aarav" maxLength={100} />
      </Field>
      <Field label="Last name">
        <Input {...field("last_name")} placeholder="Krishnan" maxLength={100} />
      </Field>
      <Field label="Father's name">
        <Input {...field("father_name")} maxLength={150} />
      </Field>
      <Field label="Mother's name">
        <Input {...field("mother_name")} maxLength={150} />
      </Field>
      <Field label="Candidate's mobile">
        <Input {...field("student_contact")} type="tel" maxLength={10} />
      </Field>
      <Field label="WhatsApp number">
        <Input {...field("student_whatsapp")} type="tel" maxLength={10} />
      </Field>
      <Field label="Parent's mobile">
        <Input {...field("parent_contact")} type="tel" maxLength={10} />
      </Field>
      <Field label="Email on the application">
        <Input {...field("student_email")} type="email" />
      </Field>
      <Field label="Community">
        <Select value={form.community} onChange={(e) => onChange({ community: e.target.value })} className="w-full">
          <option value="">Select community</option>
          {COMMUNITY_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </Field>
      <div className="sm:col-span-2">
        <p className="mb-2 text-xs font-semibold text-admin-subtle">Board cut-off marks (0–100)</p>
        <div className="grid grid-cols-3 gap-3">
          <Input {...field("cutoff_maths")} placeholder="Maths" />
          <Input {...field("cutoff_physics")} placeholder="Physics" />
          <Input {...field("cutoff_chemistry")} placeholder="Chemistry" />
        </div>
      </div>
    </div>
  );
}

export default function AdmitStudentDashboardPage() {
  const { show } = useToast();
  const [status, setStatus] = useState<SoaStatus | "all" | typeof DRAFT_TAB>("all");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [page, setPage] = useState(1);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<ApplicationFormState>(EMPTY_FORM);
  const [editing, setEditing] = useState<SoaApplicationDetail | null>(null);
  const [editForm, setEditForm] = useState<ApplicationFormState>(EMPTY_FORM);
  const [declining, setDeclining] = useState<SoaApplicationDetail | null>(null);
  const [deleting, setDeleting] = useState<SoaApplicationDetail | null>(null);

  const params = useMemo(
    () => ({
      status: status === "all" || status === DRAFT_TAB ? undefined : status,
      has_draft: status === DRAFT_TAB ? true : undefined,
      q: debouncedSearch || undefined,
      page,
      limit: 20,
    }),
    [status, debouncedSearch, page],
  );
  const { data, isLoading, isError } = useSoaApplications(params);

  const createApplication = useCreateSoaApplication();
  const updateApplication = useUpdateSoaApplication();
  const deleteApplication = useDeleteSoaApplication();
  const updateStatus = useUpdateSoaStatus();

  async function handleCreate() {
    if (!createForm.first_name.trim()) {
      show("First name is required.", "error");
      return;
    }
    try {
      await createApplication.mutateAsync(toPayload(createForm));
      show("Application created.", "success");
      setCreateOpen(false);
      setCreateForm(EMPTY_FORM);
    } catch (err) {
      show(friendlyError(err), "error");
    }
  }

  async function handleUpdate() {
    if (!editing) return;
    if (!editForm.first_name.trim()) {
      show("First name is required.", "error");
      return;
    }
    try {
      await updateApplication.mutateAsync({ id: editing.id, input: toPayload(editForm) });
      show("Application updated.", "success");
      setEditing(null);
    } catch (err) {
      show(friendlyError(err), "error");
    }
  }

  async function handleAdvance(app: SoaApplicationDetail, next: SoaStatus) {
    try {
      await updateStatus.mutateAsync({ id: app.id, status: next });
      show(`Moved to ${STATUS_LABEL[next]}.`, "success");
    } catch (err) {
      show(friendlyError(err), "error");
    }
  }

  async function handleDecline() {
    if (!declining) return;
    try {
      await updateStatus.mutateAsync({ id: declining.id, status: "cancelled" });
      show("Application declined.", "success");
      setDeclining(null);
    } catch (err) {
      show(friendlyError(err), "error");
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      await deleteApplication.mutateAsync(deleting.id);
      show("Draft deleted.", "success");
      setDeleting(null);
    } catch (err) {
      show(friendlyError(err), "error");
    }
  }

  const rows = data?.data ?? [];
  const meta = data?.meta;

  const columns: DataTableColumn<SoaApplicationDetail>[] = [
    {
      key: "applicant",
      header: "Applicant",
      render: (app) => (
        <div>
          <p className="font-semibold text-admin-ink">
            {app.first_name} {app.last_name ?? ""}
          </p>
          {app.community && <p className="text-xs text-admin-subtle">{app.community}</p>}
        </div>
      ),
    },
    {
      key: "contact",
      header: "Contact",
      render: (app) => (
        <div>
          <p className="text-admin-body">{app.student_contact ?? "—"}</p>
          {app.student_email && <p className="truncate text-xs text-admin-muted">{app.student_email}</p>}
        </div>
      ),
    },
    {
      key: "cutoffs",
      header: "Cut-offs",
      render: (app) =>
        app.cutoff_maths || app.cutoff_physics || app.cutoff_chemistry ? (
          <span className="font-mono text-admin-body">
            M {app.cutoff_maths ?? "—"} · P {app.cutoff_physics ?? "—"} · C {app.cutoff_chemistry ?? "—"}
          </span>
        ) : (
          "—"
        ),
    },
    {
      key: "status",
      header: "Status",
      render: (app) => (
        <div>
          <Badge tone={STATUS_TONE[app.status]}>{STATUS_LABEL[app.status]}</Badge>
          {app.students && <p className="mt-1 text-xs text-admin-subtle">Student {app.students.student_id_no}</p>}
          {!app.students && app.admission_profile_drafts && (
            <p className="mt-1 text-xs text-admin-warning-fg">
              Draft: {app.admission_profile_drafts.saved_categories.length} of {DRAFT_CATEGORY_COUNT} categories saved
              <span className="text-admin-subtle">{" · "}{new Date(app.admission_profile_drafts.updated_at).toLocaleDateString()}</span>
            </p>
          )}
        </div>
      ),
    },
    {
      key: "applied",
      header: "Applied",
      render: (app) => <span className="text-xs text-admin-muted">{new Date(app.created_at).toLocaleDateString()}</span>,
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (app) => (
        <div className="flex flex-wrap justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          {app.status === "admission_confirmed" && app.students && (
            <Link href={`/admin/students/${app.students.id}`}>
              <Button variant="secondary" size="sm">
                View student
              </Button>
            </Link>
          )}
          {app.status === "admission_confirmed" && !app.students && (
            <Link href={`/admin/students/admit/${app.id}`}>
              <Button variant="primary" size="sm">
                <Icon name="how_to_reg" size={15} />
                {app.admission_profile_drafts ? "Resume profile" : "Complete profile"}
              </Button>
            </Link>
          )}
          {(app.status === "applied" || app.status === "fees_paid") && (
            <>
              <button
                type="button"
                title="Edit application"
                onClick={() => {
                  setEditing(app);
                  setEditForm(toFormState(app));
                }}
                className="rounded-admin-sm p-1.5 text-admin-muted hover:bg-admin-tint-strong hover:text-admin-body"
              >
                <Icon name="edit" size={16} />
              </button>
              {app.status === "applied" ? (
                <Button variant="secondary" size="sm" onClick={() => handleAdvance(app, "fees_paid")}>
                  Mark fees paid
                </Button>
              ) : (
                <Button variant="secondary" size="sm" onClick={() => handleAdvance(app, "admission_confirmed")}>
                  Confirm admission
                </Button>
              )}
              <button
                type="button"
                title="Decline"
                onClick={() => setDeclining(app)}
                className="rounded-admin-sm p-1.5 text-admin-danger hover:bg-admin-danger-bg"
              >
                <Icon name="cancel" size={16} />
              </button>
            </>
          )}
          {app.status === "applied" && (
            <button
              type="button"
              title="Delete draft"
              onClick={() => setDeleting(app)}
              className="rounded-admin-sm p-1.5 text-admin-muted hover:bg-admin-tint-strong hover:text-admin-body"
            >
              <Icon name="delete" size={16} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <nav className="mb-3 flex items-center gap-1.5 text-sm text-admin-muted">
        <Link href="/admin/dashboard" className="hover:text-admin-body">
          Home
        </Link>
        <Icon name="chevron_right" size={15} />
        <Link href="/admin/students" className="hover:text-admin-body">
          Students
        </Link>
        <Icon name="chevron_right" size={15} />
        <span className="font-semibold text-admin-body">Admission applications</span>
      </nav>

      <PageHeader
        title="Admission applications"
        description="Every application from first intake to admission. A profile can only be completed once an application reaches Admission confirmed."
        actions={
          <Button
            variant="primary"
            onClick={() => {
              setCreateForm(EMPTY_FORM);
              setCreateOpen(true);
            }}
          >
            <Icon name="add" size={17} /> New application
          </Button>
        }
      />

      <div className="mt-5 mb-4">
        <FilterBar
          pills={STATUS_TABS.map((tab) => (
            <FilterPill
              key={tab.value}
              active={status === tab.value}
              onClick={() => {
                setStatus(tab.value);
                setPage(1);
              }}
            >
              {tab.label}
            </FilterPill>
          ))}
        >
          <div className="max-w-sm flex-1">
            <Input
              leadingIcon="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search name, email, mobile…"
            />
          </div>
        </FilterBar>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(app) => app.id}
        isLoading={isLoading}
        error={isError ? "Couldn't load applications. Try again." : null}
        emptyTitle="No applications match this filter"
        footer={meta && <Pagination page={meta.page} pageSize={meta.limit} total={meta.total} onPageChange={setPage} />}
      />

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New application" widthClassName="max-w-2xl">
        <ApplicationFormFields form={createForm} onChange={(patch) => setCreateForm((f) => ({ ...f, ...patch }))} />
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={createApplication.isPending}>
            Cancel
          </Button>
          <Button variant="primary" disabled={createApplication.isPending} onClick={handleCreate}>
            {createApplication.isPending ? "Creating…" : "Create application"}
          </Button>
        </div>
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit application" widthClassName="max-w-2xl">
        <ApplicationFormFields form={editForm} onChange={(patch) => setEditForm((f) => ({ ...f, ...patch }))} />
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setEditing(null)} disabled={updateApplication.isPending}>
            Cancel
          </Button>
          <Button variant="primary" disabled={updateApplication.isPending} onClick={handleUpdate}>
            {updateApplication.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!declining}
        title="Decline this application?"
        message={`This marks ${declining?.first_name ?? "the applicant"}'s application as cancelled. This can't be undone from here.`}
        confirmLabel="Decline"
        destructive
        isConfirming={updateStatus.isPending}
        onConfirm={handleDecline}
        onClose={() => setDeclining(null)}
      />

      <ConfirmDialog
        open={!!deleting}
        title="Delete this draft?"
        message={`This permanently removes ${deleting?.first_name ?? "this"}'s draft application. Only drafts with no fees paid can be deleted.`}
        confirmLabel="Delete"
        destructive
        isConfirming={deleteApplication.isPending}
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
