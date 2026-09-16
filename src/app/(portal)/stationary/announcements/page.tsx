"use client";

import { useMemo, useState } from "react";
import {
  PageHeader,
  Button,
  Badge,
  type BadgeTone,
  Card,
  EmptyState,
  Modal,
  FormField,
  Input,
  Select,
  Textarea,
  useToast,
} from "@/modules/admin/components/ui";
import { Icon } from "@/components/ui/Icon";
import { useAuth } from "@/lib/auth/AuthContext";
import { friendlyError } from "@/lib/utils/errors";
import {
  useStationaryAnnouncements,
  useAllClassIds,
  useBatchesLookup,
  useDepartmentClassesLookup,
  useCreateAnnouncement,
  useUpdateAnnouncement,
  useDeleteAnnouncement,
  type AnnouncementRow,
  type AnnouncementCategory,
  type BatchOption,
} from "@/modules/stationary/api/announcements";
import { useDepartments } from "@/modules/shared/api/departments";

// Ported from "Stationery Portal.dc.html"'s Announcements page (annTabs +
// annRows, lines 189-230) and its "New announcement" modal (lines 408-446).
// KNOWN GAP vs the design's 4-option audience picker (All users/Students/
// Staff/Selected departments): one real `announcements` row can only carry
// one target_audience, so "All users" and "Selected departments" each
// publish two real rows (students + teachers) — see requestsForAudience()
// below, same documented gap as secretary/api/announcements.ts.

const AUDIENCE_KEYS = ["all", "students", "staff", "department"] as const;
type AudienceKey = (typeof AUDIENCE_KEYS)[number];
const AUDIENCE_OPTION_LABEL: Record<AudienceKey, string> = {
  all: "All users",
  students: "Students",
  staff: "Staff",
  department: "Selected departments",
};

const CATEGORY_OPTIONS: { value: AnnouncementCategory; label: string }[] = [
  { value: "general", label: "Counter timing" },
  { value: "department", label: "Rate change" },
  { value: "emergency", label: "Machine downtime" },
  { value: "event", label: "Holiday notice" },
];

function audienceBadgeLabel(row: AnnouncementRow): string {
  if (row.target_audience === "teachers") return "STAFF";
  if (row.target_audience === "students") return "STUDENTS";
  return "—";
}

// "1 day ago" / "6 days ago" for the first week, then a plain date —
// matching the design's own wording exactly (lines 213 of the reference).
function fmtWhen(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 7) return `${diffDays} days ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

interface AnnForm {
  title: string;
  audience: AudienceKey;
  category: AnnouncementCategory;
  body: string;
  departmentId: string;
}
const EMPTY_FORM: AnnForm = { title: "", audience: "all", category: "general", body: "", departmentId: "" };

type Tab = "mine" | "all";

export default function StationaryAnnouncementsPage() {
  const [tab, setTab] = useState<Tab>("mine");
  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AnnouncementRow | null>(null);
  const [form, setForm] = useState<AnnForm>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<AnnouncementRow | null>(null);
  const { show } = useToast();
  const { session } = useAuth();
  const myUserId = session?.user.id;

  const { data: rows, isLoading, error } = useStationaryAnnouncements();
  const { data: allClassIds } = useAllClassIds();
  const { data: departments } = useDepartments();
  const { data: batches } = useBatchesLookup();
  const currentBatch = useMemo(
    () => (batches ?? []).reduce<BatchOption | undefined>((best, b) => (!best || b.end_year > best.end_year ? b : best), undefined),
    [batches],
  );
  const selectedDeptId = form.departmentId ? Number(form.departmentId) : undefined;
  const { data: deptClasses } = useDepartmentClassesLookup(currentBatch?.id, selectedDeptId);

  const createMutation = useCreateAnnouncement();
  const updateMutation = useUpdateAnnouncement();
  const deleteMutation = useDeleteAnnouncement();

  // GET /announcements returns every published post this role can see
  // (resolveUserContext's default case falls through to a broad-but-
  // published-only visibility for an unmapped role like Stationary) plus
  // this account's own drafts — so "All" and "My announcements" are a real
  // client-side split of one real result set, not two different fetches.
  const allRows = rows ?? [];
  const myRows = myUserId != null ? allRows.filter((r) => r.posted_by_user_id === myUserId) : [];
  const visibleRows = tab === "mine" ? myRows : allRows;

  function openComposer() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  }

  function openEditor(row: AnnouncementRow) {
    setEditTarget(row);
    setForm({
      title: row.title,
      audience: row.target_audience === "teachers" ? "staff" : "students",
      category: row.category ?? "general",
      body: row.content,
      departmentId: "",
    });
    setOpen(true);
  }

  /** Maps the design's 4 audience labels to real backend request(s) — see file header comment. */
  function requestsForAudience(): { target_audience: "teachers" | "students"; class_ids?: number[]; department_id?: number }[] {
    if (form.audience === "all") {
      const reqs: { target_audience: "teachers" | "students"; class_ids?: number[]; department_id?: number }[] = [];
      if (allClassIds && allClassIds.length > 0) reqs.push({ target_audience: "students", class_ids: allClassIds });
      reqs.push({ target_audience: "teachers" });
      return reqs;
    }
    if (form.audience === "staff") return [{ target_audience: "teachers" }];
    if (form.audience === "students") {
      return allClassIds && allClassIds.length > 0 ? [{ target_audience: "students", class_ids: allClassIds }] : [];
    }
    // "department" — needs a department selected, plus its resolved classes.
    if (!selectedDeptId) return [];
    const reqs: { target_audience: "teachers" | "students"; class_ids?: number[]; department_id?: number }[] = [
      { target_audience: "teachers", department_id: selectedDeptId },
    ];
    if (deptClasses && deptClasses.length > 0) {
      reqs.push({ target_audience: "students", class_ids: deptClasses.map((c) => c.id) });
    }
    return reqs;
  }

  async function submit() {
    if (!form.title.trim()) {
      show("Add a headline before publishing.", "error");
      return;
    }

    // Editing a single, already-published row — audience/target is fixed
    // (an existing row can't be retargeted into a different split of
    // teachers/students rows), only content fields change.
    if (editTarget) {
      try {
        await updateMutation.mutateAsync({
          id: editTarget.id,
          input: { title: form.title, content: form.body || "—", category: form.category },
        });
        setOpen(false);
        setEditTarget(null);
        setForm(EMPTY_FORM);
        show("Announcement updated.", "success");
      } catch (err) {
        show(friendlyError(err), "error");
      }
      return;
    }

    if (form.audience === "department" && !selectedDeptId) {
      show("Choose a department for this audience.", "error");
      return;
    }
    const requests = requestsForAudience();
    if (requests.length === 0) {
      show("Nothing to publish to for this audience — try again in a moment.", "error");
      return;
    }
    try {
      for (const req of requests) {
        await createMutation.mutateAsync({
          title: form.title,
          content: form.body || "—",
          status: "published",
          category: form.category,
          ...req,
        });
      }
      setOpen(false);
      setForm(EMPTY_FORM);
      show("Announcement published.", "success");
    } catch (err) {
      show(friendlyError(err), "error");
    }
  }

  function handleDelete() {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        show("Announcement deleted.", "success");
        setDeleteTarget(null);
      },
      onError: (err: unknown) => show(friendlyError(err), "error"),
    });
  }

  const sortedRows = useMemo(
    () => [...visibleRows].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [visibleRows],
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Announcements"
        description="Notices shown on the student and staff print portals"
        actions={
          <Button variant="primary" onClick={openComposer}>
            <Icon name="add" size={16} /> New announcement
          </Button>
        }
      />

      <div className="flex gap-7 border-b border-admin-divider">
        {(["mine", "all"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex items-center gap-2 border-b-2 pb-3 text-[15px] font-semibold transition-colors ${
              tab === t
                ? "border-admin-primary text-admin-primary"
                : "border-transparent text-admin-muted hover:text-admin-body"
            }`}
          >
            {t === "mine" ? "My announcements" : "All announcements"}
            <span
              className={`rounded-admin-pill px-2 py-0.5 text-xs font-bold ${
                tab === t ? "bg-admin-tint-strong text-admin-primary-deep" : "bg-admin-tint text-admin-muted"
              }`}
            >
              {t === "mine" ? myRows.length : allRows.length}
            </span>
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-admin-lg border border-admin-danger-border bg-admin-danger-bg px-4 py-3 text-sm text-admin-danger-fg">
          Failed to load announcements.
        </div>
      )}

      {!isLoading && !error && sortedRows.length === 0 ? (
        <EmptyState icon="campaign" title="No notices yet" description="Published announcements will show up here." />
      ) : (
        <div className="flex flex-col gap-3">
          {sortedRows.map((row) => {
            const tone: BadgeTone = row.status === "published" ? "success" : "neutral";
            return (
              <Card key={row.id} hoverable className="flex flex-col gap-3 p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge tone="primary">{audienceBadgeLabel(row)}</Badge>
                  <span className="text-sm text-admin-muted">{fmtWhen(row.created_at)}</span>
                  <span className="ml-auto text-sm text-admin-subtle">{row.posted_by?.name ?? "Stationary Portal"}</span>
                  <Badge tone={tone}>{row.status === "published" ? "PUBLISHED" : "DRAFT"}</Badge>
                </div>
                <div>
                  <p className="text-lg font-bold text-admin-ink">{row.title}</p>
                  <p className="mt-1 max-w-3xl text-sm text-admin-muted">{row.content}</p>
                </div>
                {row.posted_by_user_id === myUserId && (
                  <div className="flex gap-3">
                    <Button size="sm" variant="secondary" onClick={() => openEditor(row)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setDeleteTarget(row)} disabled={deleteMutation.isPending}>
                      Delete
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setEditTarget(null);
        }}
        title={editTarget ? "Edit announcement" : "New announcement"}
        widthClassName="max-w-2xl"
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {!editTarget && (
              <FormField label="Audience">
                <Select
                  value={form.audience}
                  onChange={(e) => setForm((f) => ({ ...f, audience: e.target.value as AudienceKey }))}
                >
                  {AUDIENCE_KEYS.map((k) => (
                    <option key={k} value={k}>
                      {AUDIENCE_OPTION_LABEL[k]}
                    </option>
                  ))}
                </Select>
              </FormField>
            )}
            <FormField label="Category">
              <Select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as AnnouncementCategory }))}
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          {form.audience === "department" && (
            <FormField label="Department">
              <Select value={form.departmentId} onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value }))}>
                <option value="">Select a department</option>
                {departments?.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </FormField>
          )}

          <FormField label="Headline">
            <Input
              placeholder="e.g. Colour printing unavailable on Thursday"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </FormField>
          <FormField label="Message">
            <Textarea
              rows={4}
              placeholder="Write the announcement in full"
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            />
          </FormField>

          <div className="mt-1 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setOpen(false);
                setEditTarget(null);
              }}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="button" variant="primary" onClick={submit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editTarget
                ? updateMutation.isPending
                  ? "Saving…"
                  : "Save changes"
                : createMutation.isPending
                  ? "Publishing…"
                  : "Publish"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete announcement"
        widthClassName="max-w-md"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-admin-body">Delete &ldquo;{deleteTarget?.title}&rdquo;? This can&apos;t be undone.</p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleteMutation.isPending}>
              Cancel
            </Button>
            <Button type="button" variant="danger" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
