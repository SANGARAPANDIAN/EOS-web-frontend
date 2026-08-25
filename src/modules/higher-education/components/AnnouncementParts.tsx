"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Badge, Button, Input, Select, Textarea, type BadgeTone } from "@/components/ui";
import { type Announcement } from "@/modules/shared/api/announcements";
import {
  useCreateAnnouncement,
  useUpdateAnnouncement,
  type AnnouncementCategory,
} from "@/modules/higher-education/api/announcements";
import { formatDayAndTime } from "@/lib/utils/date";

export const CATEGORY_LABEL: Record<string, string> = {
  emergency: "EMERGENCY",
  department: "DEPARTMENT",
  academic: "ACADEMIC",
  event: "EVENT",
  general: "GENERAL",
};

export const CATEGORY_TONE: Record<string, BadgeTone> = {
  emergency: "danger",
  department: "neutral",
  academic: "accentDark",
  event: "accent",
  general: "neutral",
};

const CATEGORY_OPTIONS: AnnouncementCategory[] = ["general", "academic", "department", "event", "emergency"];

export function NewAnnouncementModal({ onClose }: { onClose: () => void }) {
  const createAnnouncement = useCreateAnnouncement();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<AnnouncementCategory>("general");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!title.trim() || !content.trim()) {
      setError("Add a headline and a message.");
      return;
    }
    setError(null);
    try {
      await createAnnouncement.mutateAsync({ title: title.trim(), content: content.trim(), category });
      onClose();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Could not post this announcement.");
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-8">
      <div className="max-h-[88vh] w-full max-w-[560px] overflow-auto rounded-modal bg-surface">
        <div className="flex items-center justify-between border-b border-divider px-[26px] py-[22px]">
          <div className="text-[19px] font-extrabold text-ink">New announcement</div>
          <button type="button" onClick={onClose} className="flex size-[34px] items-center justify-center rounded-[9px] border border-border-default text-[16px] text-body">
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-4 px-[26px] py-[22px]">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Headline</label>
            <Input className="mt-1.5" placeholder="e.g. Chevening scholarship — final submissions due" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Category</label>
            <Select className="mt-1.5" value={category} onChange={(e) => setCategory(e.target.value as AnnouncementCategory)}>
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABEL[c]}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex items-center gap-2.5 rounded-[11px] border border-border-default bg-surface-tint px-3.5 py-2.5">
            <span className="text-[11px] font-bold uppercase tracking-[.05em] text-muted">Audience</span>
            <span className="text-[13px] font-bold text-ink">All students</span>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Message</label>
            <Textarea className="mt-1.5" rows={4} placeholder="Write the announcement in full" value={content} onChange={(e) => setContent(e.target.value)} />
          </div>

          {error && <div className="text-[13px] font-semibold text-danger-fg">{error}</div>}
        </div>

        <div className="flex justify-end gap-2.5 border-t border-divider px-[26px] py-[18px]">
          <Button variant="secondary" className="w-auto" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primarySmall" onClick={submit} disabled={createAnnouncement.isPending}>
            Post
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Edit modal for an announcement the signed-in user posted.
 *
 * Prefilled from the card rather than refetched: the list already holds the
 * current title, body and category, so opening the form does not need a round
 * trip.
 */
export function EditAnnouncementModal({
  announcement,
  onClose,
}: {
  announcement: { id: number; title: string; content: string; category?: string | null };
  onClose: () => void;
}) {
  const updateAnnouncement = useUpdateAnnouncement();

  const [title, setTitle] = useState(announcement.title);
  const [content, setContent] = useState(announcement.content);
  const [category, setCategory] = useState<AnnouncementCategory>(
    (announcement.category as AnnouncementCategory) ?? "general",
  );
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!title.trim() || !content.trim()) {
      setError("Add a headline and a message.");
      return;
    }
    setError(null);
    try {
      await updateAnnouncement.mutateAsync({
        id: announcement.id,
        title: title.trim(),
        content: content.trim(),
        category,
      });
      onClose();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Could not save this announcement.");
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-8">
      <div className="w-full max-w-[560px] rounded-modal bg-surface">
        <div className="flex items-center justify-between border-b border-divider px-[26px] py-[22px]">
          <div className="text-[19px] font-extrabold text-ink">Edit announcement</div>
          <button type="button" onClick={onClose} className="flex size-[34px] items-center justify-center rounded-[9px] border border-border-default text-[16px] text-body">
            ✕
          </button>
        </div>
        <div className="flex flex-col gap-4 px-[26px] py-[22px]">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Headline</label>
            <Input className="mt-1.5" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Message</label>
            <Textarea className="mt-1.5" rows={5} value={content} onChange={(e) => setContent(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Category</label>
            <Select className="mt-1.5" value={category} onChange={(e) => setCategory(e.target.value as AnnouncementCategory)}>
              <option value="general">General</option>
              <option value="academic">Academic</option>
              <option value="event">Event</option>
              <option value="department">Department</option>
              <option value="emergency">Emergency</option>
            </Select>
          </div>
          {error && <div className="text-[13px] font-semibold text-danger-fg">{error}</div>}
        </div>
        <div className="flex justify-end gap-2.5 border-t border-divider px-[26px] py-[18px]">
          <Button variant="secondary" className="w-auto" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primarySmall" onClick={() => void submit()} disabled={updateAnnouncement.isPending}>
            {updateAnnouncement.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function AnnouncementCard({
  announcement,
  canDelete,
  onDelete,
  onEdit,
}: {
  announcement: Announcement;
  canDelete: boolean;
  onDelete: (id: number) => void;
  /** Omitted for announcements the viewer did not post. */
  onEdit?: () => void;
}) {
  const cat = announcement.category;

  return (
    <div className="rounded-card border border-border-default bg-surface p-[18px_20px]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {cat && <Badge tone={CATEGORY_TONE[cat] ?? "neutral"}>{CATEGORY_LABEL[cat] ?? cat.toUpperCase()}</Badge>}
          <span className="text-[12px] text-subtle">{formatDayAndTime(announcement.created_at)}</span>
        </div>
        <div className="flex items-center gap-2.5">
          {announcement.posted_by && <span className="text-[12.5px] text-muted">{announcement.posted_by.name}</span>}
          <Badge tone={announcement.status === "published" ? "accentDark" : "neutral"}>{announcement.status.toUpperCase()}</Badge>
          {canDelete && onEdit && (
            <button type="button" onClick={onEdit} className="text-[12px] font-bold text-primary hover:underline">
              Edit
            </button>
          )}
          {canDelete && (
            <button type="button" onClick={() => onDelete(announcement.id)} className="text-[12px] font-bold text-danger-fg hover:underline">
              Delete
            </button>
          )}
        </div>
      </div>
      <div className="mt-2.5 text-[16px] font-extrabold leading-snug text-ink">{announcement.title}</div>
      <p className="mt-1.5 text-[14px] leading-relaxed text-body">{announcement.content}</p>
    </div>
  );
}
