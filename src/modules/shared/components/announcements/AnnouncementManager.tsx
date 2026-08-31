"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Badge, Button, EmptyState, Input, Select, Textarea, type BadgeTone } from "@/components/ui";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  useAnnouncements,
  useAnnouncementRoles,
  useAllAnnouncementClassIds,
  useCreateAnnouncement,
  useUpdateAnnouncement,
  useDeleteAnnouncement,
  type Announcement,
  type AnnouncementCategory,
} from "@/modules/shared/api/announcements";
import { formatDayAndTime } from "@/lib/utils/date";

/**
 * One real announcement audience choice for a role's composer. `targetAudience`
 * is the raw enum value sent to the backend. Two ways it can additionally
 * resolve a real recipient list:
 *  - `roleName`: looks up that role's id via GET /announcements/lookup/roles
 *    and sends it as role_ids (target_audience must be 'roles').
 *  - `allClasses`: fetches every class id via GET /announcements/lookup/all-classes
 *    and sends it as class_ids (an institution-wide 'students' broadcast).
 * Neither set → target_audience is sent as-is with no extra resolution
 * (e.g. EDC's fixed edc_founders/edc_inside_college/edc_all_entrepreneurs).
 */
export interface AudienceOption {
  key: string;
  label: string;
  sub: string;
  targetAudience: string;
  roleName?: string;
  allClasses?: boolean;
}

const CATEGORY_TONE: Record<string, BadgeTone> = {
  emergency: "danger",
  department: "neutral",
  academic: "accentDark",
  event: "accent",
  general: "neutral",
};

export interface AnnouncementManagerProps {
  title: string;
  subtitle: string;
  emptyMessage: string;
  audienceOptions: AudienceOption[];
  /** Omit entirely for a role whose announcements have no category concept (e.g. EDC). */
  categoryOptions?: { value: AnnouncementCategory; label: string }[];
  /** Omit for a role with no priority column in its composer (only EDC uses this today). */
  priorityOptions?: string[];
  /** Adds a second "Save as draft" action alongside Publish — only IQAC's composer needs this today. */
  supportsDraft?: boolean;
}

/**
 * The one real announcements list + composer, shared across every role that
 * manages announcements through the generic `announcements` table (IQAC, HR,
 * EDC today — nothing else about this component is role-specific, so a
 * future role's announcements page is just new AudienceOptions, not a new
 * implementation). Each role's own page.tsx is a thin wrapper supplying its
 * real audience/category/priority choices.
 *
 * Edit/Delete only ever render on a row the signed-in account itself posted
 * — role-only accounts (IQAC/HR/EDC coordinator, etc.) have no separate
 * profile name, so posted_by.name already renders as the account's own
 * email, which is what "mine" is matched against.
 */
export function AnnouncementManager({
  title,
  subtitle,
  emptyMessage,
  audienceOptions,
  categoryOptions,
  priorityOptions,
  supportsDraft,
}: AnnouncementManagerProps) {
  const { session } = useAuth();
  const list = useAnnouncements();
  const remove = useDeleteAnnouncement();

  const [composeOpen, setComposeOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const rows = useMemo(() => list.data ?? [], [list.data]);

  async function handleDelete(id: number) {
    setDeleteError(null);
    try {
      await remove.mutateAsync(id);
    } catch (err: unknown) {
      setDeleteError((err as { message?: string })?.message ?? "You can only delete your own announcement.");
    }
  }

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">{title}</h1>
          <p className="mt-1 text-[13.5px] text-muted">{subtitle}</p>
        </div>
        <Button variant="primarySmall" className="w-auto" onClick={() => setComposeOpen(true)}>
          + Add announcement
        </Button>
      </div>

      {composeOpen && (
        <ComposeAnnouncementModal
          audienceOptions={audienceOptions}
          categoryOptions={categoryOptions}
          priorityOptions={priorityOptions}
          supportsDraft={supportsDraft}
          onClose={() => setComposeOpen(false)}
        />
      )}
      {editing && (
        <ComposeAnnouncementModal
          audienceOptions={audienceOptions}
          categoryOptions={categoryOptions}
          priorityOptions={priorityOptions}
          editing={editing}
          onClose={() => setEditing(null)}
        />
      )}

      {deleteError && <div className="text-[13px] font-semibold text-danger-fg">{deleteError}</div>}

      {list.isLoading ? (
        <EmptyState message="Loading…" />
      ) : rows.length === 0 ? (
        <EmptyState message={emptyMessage} />
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((a) => {
            const isMine = a.posted_by?.name === session?.user.email;
            const audienceLabel = a.target_audience === "roles" && a.role_labels?.length ? a.role_labels.join(", ") : a.target_audience;
            return (
              <div key={a.id} className="rounded-card border border-border-default bg-surface p-[18px_20px]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    {a.category && <Badge tone={CATEGORY_TONE[a.category] ?? "neutral"}>{a.category.toUpperCase()}</Badge>}
                    {a.priority && <Badge tone="neutral">{a.priority}</Badge>}
                    <span className="text-[12px] text-subtle">{formatDayAndTime(a.created_at)}</span>
                    <span className="text-[12px] text-subtle">· {audienceLabel}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    {a.posted_by && <span className="text-[12.5px] text-muted">{a.posted_by.name}</span>}
                    <Badge tone={a.status === "published" ? "accentDark" : "neutral"}>{a.status.toUpperCase()}</Badge>
                    {isMine && (
                      <button type="button" onClick={() => setEditing(a)} className="text-[12px] font-bold text-primary hover:underline">
                        Edit
                      </button>
                    )}
                    {isMine && (
                      <button
                        type="button"
                        onClick={() => handleDelete(a.id)}
                        disabled={remove.isPending}
                        className="text-[12px] font-bold text-danger-fg hover:underline"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-2.5 text-[16px] font-extrabold leading-snug text-ink">{a.title}</div>
                <p className="mt-1.5 text-[14px] leading-relaxed text-body">{a.content}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ComposeAnnouncementModal({
  audienceOptions,
  categoryOptions,
  priorityOptions,
  supportsDraft,
  editing,
  onClose,
}: {
  audienceOptions: AudienceOption[];
  categoryOptions?: { value: AnnouncementCategory; label: string }[];
  priorityOptions?: string[];
  supportsDraft?: boolean;
  editing?: Announcement;
  onClose: () => void;
}) {
  const isEditing = editing != null;
  const needsRoleLookup = !isEditing && audienceOptions.some((o) => o.roleName);
  const needsAllClasses = !isEditing && audienceOptions.some((o) => o.allClasses);
  const roles = useAnnouncementRoles(needsRoleLookup);
  const allClassIds = useAllAnnouncementClassIds(needsAllClasses);
  const create = useCreateAnnouncement();
  const update = useUpdateAnnouncement();

  const [title, setTitle] = useState(editing?.title ?? "");
  const [content, setContent] = useState(editing?.content ?? "");
  const [category, setCategory] = useState<AnnouncementCategory | undefined>(
    (editing?.category as AnnouncementCategory | undefined) ?? categoryOptions?.[0]?.value,
  );
  const [priority, setPriority] = useState<string | undefined>(editing?.priority ?? priorityOptions?.[0]);
  const [audienceKey, setAudienceKey] = useState(audienceOptions[0]?.key ?? "");
  const [error, setError] = useState<string | null>(null);

  const selectedAudience = audienceOptions.find((o) => o.key === audienceKey);

  async function submit(status: "draft" | "published") {
    if (!title.trim() || !content.trim()) {
      setError("Title and content are both required.");
      return;
    }
    setError(null);
    try {
      if (isEditing) {
        await update.mutateAsync({
          id: editing.id,
          input: { title: title.trim(), content: content.trim(), category, priority },
        });
        onClose();
        return;
      }

      if (!selectedAudience) {
        setError("Choose an audience.");
        return;
      }
      const roleId = selectedAudience.roleName ? roles.data?.find((r) => r.name === selectedAudience.roleName)?.id : undefined;
      if (status === "published") {
        if (selectedAudience.roleName && !roleId) {
          setError("Could not resolve that role. Try again in a moment.");
          return;
        }
        if (selectedAudience.allClasses && !allClassIds.data?.length) {
          setError("Could not resolve the audience. Try again in a moment.");
          return;
        }
      }
      await create.mutateAsync({
        title: title.trim(),
        content: content.trim(),
        category,
        priority,
        target_audience: selectedAudience.targetAudience,
        class_ids: selectedAudience.allClasses ? allClassIds.data : undefined,
        role_ids: roleId ? [roleId] : undefined,
        status,
      });
      onClose();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Could not save this announcement.");
    }
  }

  const isPending = create.isPending || update.isPending;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-8">
      <div className="max-h-[88vh] w-full max-w-[560px] overflow-auto rounded-modal bg-surface">
        <div className="flex items-center justify-between border-b border-divider px-[26px] py-[22px]">
          <div className="text-[19px] font-extrabold text-ink">{isEditing ? "Edit announcement" : "New announcement"}</div>
          <button type="button" onClick={onClose} className="flex size-[34px] items-center justify-center rounded-[9px] border border-border-default text-[16px] text-body">
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-4 px-[26px] py-[22px]">
          {isEditing ? (
            <div className="flex items-center gap-2.5 rounded-[11px] border border-border-default bg-surface-tint px-3.5 py-2.5">
              <span className="text-[11px] font-bold uppercase tracking-[.05em] text-muted">Audience</span>
              <span className="text-[13px] font-bold text-ink">{editing.target_audience}</span>
            </div>
          ) : (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Audience</label>
              <Select className="mt-1.5" value={audienceKey} onChange={(e) => setAudienceKey(e.target.value)}>
                {audienceOptions.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </Select>
              {selectedAudience && <p className="mt-1 text-[11.5px] text-subtle">{selectedAudience.sub}</p>}
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Title</label>
            <Input className="mt-1.5" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Appraisal cycle closes this Friday" />
          </div>

          {categoryOptions && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Category</label>
              <Select className="mt-1.5" value={category} onChange={(e) => setCategory(e.target.value as AnnouncementCategory)}>
                {categoryOptions.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {priorityOptions && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Priority</label>
              <Select className="mt-1.5" value={priority} onChange={(e) => setPriority(e.target.value)}>
                {priorityOptions.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Content</label>
            <Textarea className="mt-1.5" rows={5} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write the announcement in full" />
          </div>

          {error && <div className="text-[13px] font-semibold text-danger-fg">{error}</div>}
        </div>

        <div className="flex justify-end gap-2.5 border-t border-divider px-[26px] py-[18px]">
          <Button variant="secondary" className="w-auto" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          {!isEditing && supportsDraft && (
            <Button variant="secondary" className="w-auto" onClick={() => void submit("draft")} disabled={isPending}>
              Save as draft
            </Button>
          )}
          <Button variant="primarySmall" onClick={() => void submit("published")} disabled={isPending}>
            {isPending ? "Saving…" : isEditing ? "Save changes" : "Publish now"}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
