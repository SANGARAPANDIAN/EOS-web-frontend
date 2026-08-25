"use client";

import { useCallback, useMemo, useState } from "react";
import { Badge, Button, DataTable, type BadgeTone, type DataTableColumn } from "@/components/ui";
import { PageCrumbs } from "@/modules/iqac/components/PageControls";
import {
  useAllAnnouncements,
  useAllClassIds,
  useAnnouncementRoles,
  useCreateAnnouncement,
  useDeleteAnnouncement,
  type Announcement,
  type AnnouncementCategory,
} from "@/modules/iqac/api/announcements";
import { formatDisplayDate } from "@/lib/utils/date";

const CATEGORY_OPTIONS: { value: AnnouncementCategory; label: string }[] = [
  { value: "event", label: "Event" },
  { value: "academic", label: "Academic" },
  { value: "department", label: "Department" },
  { value: "emergency", label: "Emergency" },
  { value: "general", label: "General" },
];

const CATEGORY_TONE: Record<string, BadgeTone> = {
  event: "accent",
  academic: "accent",
  department: "neutral",
  general: "neutral",
  emergency: "danger",
};

const STATUS_TONE: Record<Announcement["status"], BadgeTone> = { published: "accent", draft: "neutral" };

type AudienceKey = "students" | "faculty" | "hod" | "hr" | "placement";

const AUDIENCE_OPTIONS: { value: AudienceKey; label: string; sub: string; roleName?: string }[] = [
  { value: "students", label: "Students", sub: "every student, institution-wide" },
  { value: "faculty", label: "Faculty", sub: "every faculty account, institution-wide" },
  { value: "hod", label: "HOD", sub: "every Head of Department account", roleName: "hod" },
  { value: "hr", label: "HR", sub: "the HR & Payroll account", roleName: "hr_payroll" },
  { value: "placement", label: "Placement", sub: "the Placement Cell account", roleName: "placement" },
];

function ComposeForm({ onClose }: { onClose: () => void }) {
  const allClassIds = useAllClassIds();
  const roles = useAnnouncementRoles();
  const create = useCreateAnnouncement();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<AnnouncementCategory>("general");
  const [audience, setAudience] = useState<AudienceKey>("students");
  const [error, setError] = useState<string | null>(null);

  const selectedOption = AUDIENCE_OPTIONS.find((a) => a.value === audience)!;
  const targetRole = selectedOption.roleName ? roles.data?.find((r) => r.name === selectedOption.roleName) : undefined;

  async function submit(asDraft: boolean) {
    if (!title.trim() || !content.trim()) {
      setError("Title and content are both required.");
      return;
    }
    if (!asDraft && audience === "students" && !allClassIds.data?.length) {
      setError("Could not resolve the audience. Try again in a moment.");
      return;
    }
    if (!asDraft && selectedOption.roleName && !targetRole) {
      setError("Could not resolve that role. Try again in a moment.");
      return;
    }
    setError(null);
    try {
      await create.mutateAsync({
        title: title.trim(),
        content: content.trim(),
        category,
        target_audience: audience === "students" ? "students" : audience === "faculty" ? "teachers" : "roles",
        class_ids: audience === "students" ? allClassIds.data ?? [] : undefined,
        role_ids: targetRole ? [targetRole.id] : undefined,
        status: asDraft ? "draft" : "published",
      });
      setTitle("");
      setContent("");
      onClose();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Could not save this announcement.");
    }
  }

  return (
    <div className="rounded-card border border-border-default bg-surface p-6">
      <h2 className="text-[17px] font-extrabold text-ink">New announcement</h2>
      <p className="mt-1 text-[13px] text-muted">{selectedOption.sub}.</p>

      <div className="mt-4">
        <label className="text-[13.5px] font-bold text-primary">Audience</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {AUDIENCE_OPTIONS.map((a) => (
            <button
              key={a.value}
              type="button"
              onClick={() => setAudience(a.value)}
              className={`hover-lift h-9 rounded-[9px] border px-3.5 text-[13px] font-bold ${
                audience === a.value ? "border-primary-border bg-accent-50 text-primary" : "border-border-default bg-surface text-body"
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <label className="text-[13.5px] font-bold text-primary">Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. NAAC peer team visit — schedule"
          className="mt-2 h-11 w-full rounded-[11px] border border-border-default px-3.5 text-[14px] outline-none focus:border-primary"
        />
      </div>

      <div className="mt-4">
        <label className="text-[13.5px] font-bold text-primary">Category</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {CATEGORY_OPTIONS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory(c.value)}
              className={`hover-lift h-9 rounded-[9px] border px-3.5 text-[13px] font-bold ${
                category === c.value ? "border-primary-border bg-accent-50 text-primary" : "border-border-default bg-surface text-body"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <label className="text-[13.5px] font-bold text-primary">Content</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          placeholder="Write the notice."
          className="mt-2 w-full rounded-[11px] border border-border-default px-3.5 py-2.5 text-[13.5px] leading-relaxed outline-none focus:border-primary"
        />
      </div>

      {error && <div className="mt-3 text-[13px] font-semibold text-danger-fg">{error}</div>}

      <div className="mt-4 flex justify-end gap-3">
        <button type="button" onClick={() => submit(true)} disabled={create.isPending} className="h-[42px] rounded-[10px] border border-border-default bg-surface px-4 text-[13.5px] font-bold text-ink hover:bg-surface-tint">
          Save draft
        </button>
        <Button variant="primarySmall" className="h-[42px] w-auto px-4" onClick={() => submit(false)} disabled={create.isPending}>
          {create.isPending ? "Publishing…" : "Publish now"}
        </Button>
      </div>
    </div>
  );
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function IqacAnnouncementsPage() {
  const [composeOpen, setComposeOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const list = useAllAnnouncements();
  const remove = useDeleteAnnouncement();

  const rows = useMemo(() => list.data ?? [], [list.data]);

  function handleExportCsv() {
    const header = ["ID", "Announcement", "Category", "Audience", "Issued by", "Date", "Status"];
    const body = rows.map((r) => [
      String(r.id),
      r.title,
      r.category ?? "—",
      r.target_audience,
      r.posted_by?.name ?? "—",
      formatDisplayDate(r.created_at),
      r.status === "published" ? "Published" : "Draft",
    ]);
    downloadCsv("announcements.csv", [header, ...body]);
  }

  function handleExportPdf() {
    try {
      window.print();
    } catch {
      // print unavailable in this environment — no-op, matching the reference design's own try/catch.
    }
  }

  const handleDelete = useCallback(
    async (id: number) => {
      setDeleteError(null);
      try {
        await remove.mutateAsync(id);
      } catch (err: unknown) {
        setDeleteError((err as { message?: string })?.message ?? "You can only delete your own announcement.");
      }
    },
    [remove],
  );

  const columns = useMemo<DataTableColumn<Announcement>[]>(
    () => [
      { key: "id", header: "ID", width: "0.5fr", sortValue: (r) => r.id, render: (r) => r.id },
      { key: "title", header: "Announcement", width: "1.8fr", sortValue: (r) => r.title, render: (r) => <span className="font-bold text-ink">{r.title}</span> },
      { key: "category", header: "Category", sortValue: (r) => r.category ?? "", render: (r) => (r.category ? <Badge tone={CATEGORY_TONE[r.category]}>{r.category}</Badge> : "—") },
      { key: "audience", header: "Audience", sortValue: (r) => r.target_audience, render: (r) => r.target_audience },
      { key: "issued_by", header: "Issued by", sortValue: (r) => r.posted_by?.name ?? "", render: (r) => r.posted_by?.name ?? "—" },
      { key: "date", header: "Date", sortValue: (r) => r.created_at, render: (r) => formatDisplayDate(r.created_at) },
      { key: "status", header: "Status", sortValue: (r) => r.status, render: (r) => <Badge tone={STATUS_TONE[r.status]}>{r.status === "published" ? "Published" : "Draft"}</Badge> },
      {
        key: "actions",
        header: "",
        width: "0.6fr",
        render: (r) => (
          <button type="button" onClick={() => handleDelete(r.id)} disabled={remove.isPending} className="text-[12.5px] font-bold text-danger-fg hover:underline">
            Delete
          </button>
        ),
      },
    ],
    [remove.isPending, handleDelete],
  );

  return (
    <div className="flex flex-col gap-5 animate-pop-in">
      <PageCrumbs items={["IQAC", "Announcements"]} />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-extrabold tracking-[-.03em] text-ink">Announcements</h1>
          <p className="mt-1 text-[13.5px] text-muted">Every real institution-wide announcement — oversight view, same broadcast tier as Admin/Principal.</p>
        </div>
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={handleExportCsv}
            className="h-11 rounded-[10px] border border-border-default bg-surface px-4 text-[13px] font-bold text-ink hover:bg-surface-tint"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            className="h-11 rounded-[10px] border border-border-default bg-surface px-4 text-[13px] font-bold text-ink hover:bg-surface-tint"
          >
            Export PDF
          </button>
          <Button variant="primarySmall" className="w-auto" onClick={() => setComposeOpen((v) => !v)}>
            {composeOpen ? "Close" : "+ Add announcement"}
          </Button>
        </div>
      </div>

      {composeOpen && <ComposeForm onClose={() => setComposeOpen(false)} />}

      {deleteError && <div className="text-[13px] font-semibold text-danger-fg">{deleteError}</div>}

      <DataTable columns={columns} data={rows} rowKey={(r) => r.id} loading={list.isLoading} emptyMessage="No announcements match these filters." hoverableRows />
    </div>
  );
}
