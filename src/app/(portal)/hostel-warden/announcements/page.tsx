"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Badge, Button, Card, EmptyState, Input, Select, Textarea, type BadgeTone } from "@/components/ui";
import {
  useHostelAnnouncements,
  useCreateHostelAnnouncement,
  type AnnouncementCategory,
} from "@/modules/hostel-warden/api/announcements";
import { formatDayAndTime } from "@/lib/utils/date";

const CATEGORY_TONE: Record<AnnouncementCategory, BadgeTone> = {
  emergency: "danger",
  event: "accent",
  academic: "accentDark",
  department: "accentDark",
  general: "neutral",
};

function NewAnnouncementModal({ onClose }: { onClose: () => void }) {
  const create = useCreateHostelAnnouncement();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<AnnouncementCategory>("general");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!title.trim() || !content.trim()) {
      setError("Title and message are both required.");
      return;
    }
    setError(null);
    try {
      await create.mutateAsync({ title: title.trim(), content: content.trim(), category });
      onClose();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Could not publish this announcement.");
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-8">
      <div className="w-full max-w-[520px] rounded-modal bg-surface">
        <div className="flex items-center justify-between border-b border-divider px-[26px] py-[22px]">
          <div className="text-[19px] font-extrabold text-ink">New announcement</div>
          <button type="button" onClick={onClose} className="flex size-[34px] items-center justify-center rounded-[9px] border border-border-default text-[16px] text-body">
            ✕
          </button>
        </div>
        <div className="flex flex-col gap-4 px-[26px] py-[22px]">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Category</label>
            <Select className="mt-1.5" value={category} onChange={(e) => setCategory(e.target.value as AnnouncementCategory)}>
              <option value="general">General</option>
              <option value="emergency">Emergency</option>
              <option value="event">Event</option>
              <option value="academic">Academic</option>
              <option value="department">Department</option>
            </Select>
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Headline</label>
            <Input className="mt-1.5" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Dengue prevention · hostel blocks" />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Message</label>
            <Textarea className="mt-1.5" rows={4} value={content} onChange={(e) => setContent(e.target.value)} placeholder="What students should do" />
          </div>
          {error && <div className="text-[13px] font-semibold text-danger-fg">{error}</div>}
        </div>
        <div className="flex justify-end gap-2.5 border-t border-divider px-[26px] py-[18px]">
          <Button variant="secondary" className="w-auto" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primarySmall" className="w-auto" onClick={submit} disabled={create.isPending}>
            Publish
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function AnnouncementsPage() {
  const announcements = useHostelAnnouncements();
  const [showNew, setShowNew] = useState(false);

  const rows = announcements.data ?? [];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Announcements</h1>
          <p className="mt-1 text-[13px] text-muted">Circulars from the hostel wardens, shared with residents.</p>
        </div>
        <Button variant="primarySmall" className="w-auto" onClick={() => setShowNew(true)}>
          New announcement
        </Button>
      </div>

      {showNew && <NewAnnouncementModal onClose={() => setShowNew(false)} />}

      {announcements.isLoading ? (
        <EmptyState message="Loading…" />
      ) : rows.length === 0 ? (
        <EmptyState message="No announcements published yet." />
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((a) => (
            <Card key={a.id}>
              <div className="flex items-center gap-2.5">
                {a.category && <Badge tone={CATEGORY_TONE[a.category]}>{a.category.toUpperCase()}</Badge>}
                <span className="font-mono text-[12px] text-subtle">{formatDayAndTime(a.created_at)}</span>
                <div className="flex-1" />
                <span className="text-[13px] text-muted">{a.by}</span>
              </div>
              <div className="mt-2 text-[16px] font-bold text-ink">{a.title}</div>
              <div className="mt-1 text-[14px] text-body">{a.content}</div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
