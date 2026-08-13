"use client";

import { useMemo, useState } from "react";
import { Card, Badge, Button, EmptyState, Select, Textarea, Input, SkeletonRows } from "@/components/ui";
import {
  useHodAnnouncements,
  useCreateHodAnnouncement,
  type HodAnnouncement,
  type AnnouncementCategory,
} from "@/modules/hod/api/announcements";
import { useHodClasses } from "@/modules/hod/api/classRecords";
import { useHodDashboard } from "@/modules/hod/api/dashboard";
import { formatDayAndTime } from "@/lib/utils/date";
import { ROLE_LABEL } from "@/lib/config";

type Audience = "students" | "teachers";

function audienceLabel(a: HodAnnouncement, deptCode: string, totalClasses: number): string {
  if (a.classes.length === 0) return "No classes selected";
  const coversAll = a.classes.length >= totalClasses;
  if (coversAll) {
    return a.target_audience === "teachers" ? `All ${deptCode} faculty` : `Everyone in ${deptCode}`;
  }
  const labels = a.classes.map((c) => c.label).join(", ");
  if (a.target_audience === "teachers") return `Faculty of ${labels}`;
  if (a.target_audience === "parents") return `Parents of ${labels}`;
  return labels;
}

function categoryTone(category: AnnouncementCategory): "accent" | "accentDark" | "neutral" | "danger" {
  if (category === "emergency") return "danger";
  if (category === "department") return "accentDark";
  if (category === "academic") return "accent";
  return "neutral";
}

function posterLabel(a: HodAnnouncement): string {
  if (!a.posted_by) return "—";
  if (a.posted_by.role === "hod" && a.posted_by.department_code) {
    return `HoD · ${a.posted_by.department_code}`;
  }
  return ROLE_LABEL[a.posted_by.role] ?? a.posted_by.role;
}

export default function HodAnnouncementsPage() {
  const announcements = useHodAnnouncements();
  const classes = useHodClasses();
  const dashboard = useHodDashboard();
  const [showModal, setShowModal] = useState(false);

  const deptCode = dashboard.data?.department.code ?? "";

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-[#080000]">Announcements</h1>
          <p className="mt-1 text-[13px] text-muted">Circulars from the institution and posts you publish to your department</p>
        </div>
        <Button variant="primarySmall" onClick={() => setShowModal(true)}>
          New announcement
        </Button>
      </div>

      {announcements.isLoading ? (
        <SkeletonRows count={5} />
      ) : !announcements.data || announcements.data.length === 0 ? (
        <Card>
          <EmptyState message="No announcements yet." />
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {announcements.data.map((a) => (
            <div key={a.id} className="hod-hover-row rounded-[11px] border border-border-default px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {a.category && <Badge tone={categoryTone(a.category)}>{a.category.toUpperCase()}</Badge>}
                  <span className="text-[11.5px] text-subtle">{formatDayAndTime(a.created_at)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[12.5px] text-muted">{posterLabel(a)}</span>
                  <Badge tone={a.status === "published" ? "accent" : "neutral"}>{a.status.toUpperCase()}</Badge>
                </div>
              </div>
              <div className="mt-1.5 text-[15px] font-bold text-ink">{a.title}</div>
              <div className="mt-1 text-[13px] text-body">{a.content}</div>
              <div className="mt-2 text-[12px] text-subtle">
                Audience · {audienceLabel(a, deptCode, classes.data?.length ?? 0)}
                {a.scheduled_at ? ` · Scheduled for ${formatDayAndTime(a.scheduled_at)}` : ""}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <NewAnnouncementModal
          deptCode={deptCode}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

function NewAnnouncementModal({ deptCode, onClose }: { deptCode: string; onClose: () => void }) {
  const classes = useHodClasses();
  const createAnnouncement = useCreateHodAnnouncement();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [audienceKey, setAudienceKey] = useState("all-students");
  const [category, setCategory] = useState<AnnouncementCategory>("general");
  const [scheduledAt, setScheduledAt] = useState("");

  const allClassIds = useMemo(() => (classes.data ?? []).map((c) => c.class_id), [classes.data]);

  const audienceOptions = useMemo(() => {
    const options: { key: string; label: string; audience: Audience; class_ids: number[] }[] = [
      { key: "all-students", label: `Everyone in ${deptCode} (all classes)`, audience: "students", class_ids: allClassIds },
      { key: "all-faculty", label: `All ${deptCode} faculty`, audience: "teachers", class_ids: allClassIds },
    ];
    for (const c of classes.data ?? []) {
      options.push({
        key: `class-${c.class_id}`,
        label: `${c.year}-${c.section}`,
        audience: "students",
        class_ids: [c.class_id],
      });
    }
    return options;
  }, [classes.data, allClassIds, deptCode]);

  async function submit(status: "draft" | "published") {
    const selected = audienceOptions.find((o) => o.key === audienceKey);
    if (!title.trim() || !content.trim() || !selected || selected.class_ids.length === 0) return;
    await createAnnouncement.mutateAsync({
      title: title.trim(),
      content: content.trim(),
      target_audience: selected.audience,
      class_ids: selected.class_ids,
      status,
      category,
      scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1e3d]/45 p-4">
      <div className="w-full max-w-[620px] rounded-modal bg-surface p-7 shadow-modal">
        <div className="flex items-center justify-between border-b border-divider pb-4">
          <h2 className="text-[22px] font-extrabold text-ink">New announcement</h2>
          <button
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-input border border-border-default text-subtle hover:bg-nav-hover"
          >
            ×
          </button>
        </div>

        <div className="mt-5 flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-[13px] font-bold text-primary">Headline</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. CIA-II retest schedule for CSE published"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-primary">Audience</label>
              <Select value={audienceKey} onChange={(e) => setAudienceKey(e.target.value)}>
                {audienceOptions.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-primary">Category</label>
              <Select value={category} onChange={(e) => setCategory(e.target.value as AnnouncementCategory)}>
                <option value="general">General</option>
                <option value="academic">Academic</option>
                <option value="department">Department</option>
                <option value="event">Event</option>
                <option value="emergency">Emergency</option>
              </Select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-bold text-primary">Message</label>
            <Textarea
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write the announcement in full"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-bold text-primary">Schedule for (optional)</label>
            <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
            <p className="mt-1 text-[11.5px] text-subtle">
              Saved as a reminder on the announcement — publishing itself still has to be done manually at that time.
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-divider pt-5">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => submit("draft")} disabled={createAnnouncement.isPending}>
              Save as draft
            </Button>
            <Button variant="primarySmall" onClick={() => submit("published")} disabled={createAnnouncement.isPending}>
              Publish now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
