"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Badge, Button, EmptyState, Input, Select, Textarea, type BadgeTone } from "@/components/ui";
import { useAdvisories, useCreateAdvisory, type AdvisoryCategory } from "@/modules/medical-centre/api/advisories";
import { formatDayAndTime } from "@/lib/utils/date";

const TAG_TONE: Record<AdvisoryCategory, BadgeTone> = {
  emergency: "danger",
  event: "accent",
  academic: "accentDark",
  department: "accentDark",
  general: "neutral",
};

function NewAdvisoryModal({ onClose }: { onClose: () => void }) {
  const create = useCreateAdvisory();
  const [category, setCategory] = useState<AdvisoryCategory>("general");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!title.trim() || !body.trim()) {
      setError("Add a title and a message.");
      return;
    }
    setError(null);
    try {
      await create.mutateAsync({ title: title.trim(), content: body.trim(), category });
      onClose();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Could not publish this advisory.");
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-8">
      <div className="max-h-[88vh] w-full max-w-[560px] overflow-auto rounded-modal bg-surface">
        <div className="flex items-center justify-between border-b border-divider px-[26px] py-[22px]">
          <div className="text-[19px] font-extrabold text-ink">New advisory</div>
          <button type="button" onClick={onClose} className="flex size-[34px] items-center justify-center rounded-[9px] border border-border-default text-[16px] text-body">
            ✕
          </button>
        </div>
        <div className="flex flex-col gap-4 px-[26px] py-[22px]">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Category</label>
            <Select className="mt-1.5" value={category} onChange={(e) => setCategory(e.target.value as AdvisoryCategory)}>
              <option value="general">General</option>
              <option value="emergency">Emergency</option>
              <option value="event">Event</option>
              <option value="academic">Academic</option>
              <option value="department">Department</option>
            </Select>
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Title</label>
            <Input className="mt-1.5" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[.05em] text-muted">Body</label>
            <Textarea className="mt-1.5" rows={4} value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
          {error && <div className="text-[13px] font-semibold text-danger-fg">{error}</div>}
        </div>
        <div className="flex justify-end gap-2.5 border-t border-divider px-[26px] py-[18px]">
          <Button variant="secondary" className="w-auto" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primarySmall" onClick={submit} disabled={create.isPending}>
            Publish advisory
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function HealthAdvisoriesPage() {
  const advisories = useAdvisories();
  const [showNew, setShowNew] = useState(false);
  const rows = advisories.data ?? [];

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Health advisories</h1>
          <p className="mt-1 text-[13px] text-muted">Notices the medical centre publishes to students.</p>
        </div>
        <Button variant="primarySmall" className="w-auto" onClick={() => setShowNew(true)}>
          New advisory
        </Button>
      </div>

      {showNew && <NewAdvisoryModal onClose={() => setShowNew(false)} />}

      {advisories.isLoading ? (
        <EmptyState message="Loading…" />
      ) : rows.length === 0 ? (
        <EmptyState message="No advisories published yet." />
      ) : (
        <div className="flex flex-col gap-3.5">
          {rows.map((a) => (
            <div key={a.id} className="rounded-card border border-border-default bg-surface p-[18px_22px] transition-all duration-150 hover:-translate-y-1 hover:border-primary hover:shadow-hover-lift">
              <div className="flex items-center gap-2.5">
                <Badge tone={TAG_TONE[a.tag]}>{a.tag.toUpperCase()}</Badge>
                <span className="text-[13px] text-subtle">{formatDayAndTime(a.when)}</span>
                <span className="flex-1" />
                <span className="text-[13px] text-subtle">{a.by}</span>
                <Badge tone="accentDark">PUBLISHED</Badge>
              </div>
              <div className="mt-2.5 text-[17px] font-extrabold text-ink">{a.title}</div>
              <p className="mt-1 text-[13.5px] leading-relaxed text-body">{a.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
