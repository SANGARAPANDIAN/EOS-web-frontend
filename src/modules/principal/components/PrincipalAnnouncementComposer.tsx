"use client";

import { useMemo, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { principalColors } from "@/modules/principal/theme";
import {
  useClasses,
  useDepartments,
  useCreateAnnouncement,
  useUploadAnnouncementAttachment,
  type CreateAnnouncementInput,
} from "@/modules/principal/api/announcements";

interface AudienceGroup {
  key: string;
  label: string;
  note?: string;
  /** Given every real class id (optionally scoped to one department), returns the real create() calls needed to reach this group. */
  buildRequests: (allClassIds: number[], deptClassIds: number[]) => Omit<CreateAnnouncementInput, "title" | "content" | "status">[];
}

const BASE_GROUPS: AudienceGroup[] = [
  {
    key: "institution",
    label: "Entire institution (all students + faculty + staff)",
    note: "Reaches all students and all faculty across every department. Non-teaching staff see every Principal announcement automatically — there's no separate way to target them individually.",
    buildRequests: (allClassIds) => [
      { target_audience: "students", class_ids: allClassIds },
      { target_audience: "teachers", class_ids: allClassIds },
    ],
  },
  {
    key: "all_students",
    label: "All students · all departments",
    buildRequests: (allClassIds) => [{ target_audience: "students", class_ids: allClassIds }],
  },
  {
    key: "all_faculty",
    label: "All faculty · all departments",
    buildRequests: (allClassIds) => [{ target_audience: "teachers", class_ids: allClassIds }],
  },
  {
    key: "all_parents",
    label: "All parents / guardians",
    buildRequests: (allClassIds) => [{ target_audience: "parents", class_ids: allClassIds }],
  },
];

const CATEGORY_OPTIONS: { value: CreateAnnouncementInput["category"]; label: string }[] = [
  { value: "academic", label: "ACADEMIC" },
  { value: "department", label: "DEPARTMENT" },
  { value: "emergency", label: "EMERGENCY" },
  { value: "event", label: "EVENT" },
  { value: "general", label: "GENERAL" },
];

interface PrincipalAnnouncementComposerProps {
  onClose: () => void;
}

export function PrincipalAnnouncementComposer({ onClose }: PrincipalAnnouncementComposerProps) {
  const classes = useClasses();
  const departments = useDepartments();
  const createAnnouncement = useCreateAnnouncement();
  const uploadAttachment = useUploadAnnouncementAttachment();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<CreateAnnouncementInput["category"]>("academic");
  const [search, setSearch] = useState("");
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [publishing, setPublishing] = useState<"draft" | "published" | null>(null);
  const [publishError, setPublishError] = useState(false);

  const allClassIds = useMemo(() => (classes.data ?? []).map((c) => c.id), [classes.data]);

  const groups: AudienceGroup[] = useMemo(() => {
    const deptGroups: AudienceGroup[] = (departments.data ?? []).map((d) => ({
      key: `dept_${d.id}`,
      label: `${d.code} · all classes + faculty`,
      buildRequests: (_all, deptClassIds) => [
        { target_audience: "students", class_ids: deptClassIds },
        { target_audience: "teachers", class_ids: deptClassIds },
      ],
    }));
    return [...BASE_GROUPS, ...deptGroups];
  }, [departments.data]);

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return groups;
    const q = search.trim().toLowerCase();
    return groups.filter((g) => g.label.toLowerCase().includes(q));
  }, [groups, search]);

  function toggleGroup(key: string) {
    setSelectedGroups((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  const canSubmit = title.trim().length > 0 && content.trim().length > 0 && selectedGroups.length > 0 && allClassIds.length > 0;

  async function publish(status: "draft" | "published") {
    if (!canSubmit) return;
    setPublishing(status);
    setPublishError(false);
    try {
      const createdIds: number[] = [];
      for (const key of selectedGroups) {
        const group = groups.find((g) => g.key === key);
        if (!group) continue;
        const deptId = key.startsWith("dept_") ? Number(key.replace("dept_", "")) : null;
        const deptClassIds = deptId != null ? (classes.data ?? []).filter((c) => c.department_id === deptId).map((c) => c.id) : [];
        for (const req of group.buildRequests(allClassIds, deptClassIds)) {
          const created = await createAnnouncement.mutateAsync({
            title: title.trim(),
            content: content.trim(),
            status: status === "draft" ? "draft" : undefined,
            category,
            ...req,
          });
          createdIds.push(created.id);
        }
      }
      if (attachedFile) {
        for (const id of createdIds) {
          await uploadAttachment.mutateAsync({ id, file: attachedFile });
        }
      }
      onClose();
    } catch {
      setPublishError(true);
    } finally {
      setPublishing(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border"
        style={{ background: principalColors.bg, borderColor: principalColors.border }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b px-6 py-4" style={{ borderColor: principalColors.borderLight }}>
          <div className="text-[22px] font-extrabold" style={{ fontFamily: "var(--font-plus-jakarta-sans)", color: principalColors.heading }}>
            New announcement
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto grid h-9 w-9 place-items-center rounded-lg border"
            style={{ borderColor: principalColors.border, color: principalColors.textFaint }}
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
          <div>
            <label className="mb-1.5 block text-sm font-bold" style={{ color: principalColors.primary }}>
              Headline
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={150}
              className="h-11 w-full rounded-[10px] border px-3 text-sm outline-none"
              style={{ borderColor: principalColors.border, background: principalColors.surfaceMuted, color: principalColors.heading }}
              placeholder="e.g. CIA-II retest schedule for CSE published"
            />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-bold" style={{ color: principalColors.primary }}>
                Audience
              </label>
              <div className="flex h-10 items-center gap-2 rounded-[10px] border px-3" style={{ borderColor: principalColors.border, background: principalColors.surfaceMuted }}>
                <Icon name="search" size={16} style={{ color: principalColors.textFaint }} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-transparent text-sm outline-none"
                  style={{ color: principalColors.heading }}
                  placeholder="Search audience — department, group…"
                />
              </div>

              <div className="mt-2 max-h-48 overflow-y-auto rounded-[10px] border" style={{ borderColor: principalColors.border }}>
                {(classes.isLoading || departments.isLoading) && (
                  <div className="px-3 py-3 text-sm" style={{ color: principalColors.textFaint }}>
                    Loading…
                  </div>
                )}
                {filteredGroups.map((g) => {
                  const selected = selectedGroups.includes(g.key);
                  return (
                    <label
                      key={g.key}
                      className="flex cursor-pointer items-start gap-2.5 border-b px-3 py-2.5 last:border-b-0"
                      style={{ borderColor: principalColors.borderMuted, background: selected ? principalColors.surfaceTint : "transparent" }}
                    >
                      <input type="checkbox" checked={selected} onChange={() => toggleGroup(g.key)} className="mt-0.5" />
                      <span className="text-sm font-medium" style={{ color: selected ? principalColors.primaryDark : principalColors.heading }}>
                        {g.label}
                      </span>
                    </label>
                  );
                })}
              </div>

              <div className="mt-2 flex items-center gap-3 text-[13px]" style={{ color: principalColors.textFaint }}>
                <span>{selectedGroups.length} group{selectedGroups.length === 1 ? "" : "s"} selected</span>
                <button type="button" onClick={() => setSelectedGroups(groups.map((g) => g.key))} className="font-semibold" style={{ color: principalColors.primary }}>
                  Select all
                </button>
                <button type="button" onClick={() => setSelectedGroups([])} className="font-semibold" style={{ color: principalColors.primary }}>
                  Clear
                </button>
              </div>

              {selectedGroups.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedGroups.map((key) => {
                    const g = groups.find((x) => x.key === key);
                    if (!g) return null;
                    return (
                      <span
                        key={key}
                        className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
                        style={{ background: principalColors.surfaceTint, color: principalColors.primaryDark }}
                      >
                        {g.label}
                        <button type="button" onClick={() => toggleGroup(key)}>
                          <Icon name="close" size={13} />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              {groups.find((g) => selectedGroups.includes(g.key) && g.note) && (
                <p className="mt-2 text-xs" style={{ color: principalColors.textFaint }}>
                  {groups.find((g) => selectedGroups.includes(g.key) && g.note)?.note}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-bold" style={{ color: principalColors.primary }}>
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as CreateAnnouncementInput["category"])}
                className="h-10 w-full rounded-[10px] border px-3 text-sm outline-none"
                style={{ borderColor: principalColors.border, background: principalColors.surfaceMuted, color: principalColors.heading }}
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs" style={{ color: principalColors.textFaint }}>
                Saved once your admin runs a small pending database update — until then this choice
                isn&apos;t stored.
              </p>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-bold" style={{ color: principalColors.primary }}>
              Message
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              className="w-full rounded-[10px] border px-3 py-2 text-sm outline-none"
              style={{ borderColor: principalColors.border, background: principalColors.surfaceMuted, color: principalColors.heading }}
              placeholder="Write the announcement in full"
            />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-bold" style={{ color: principalColors.primary }}>
                Schedule for
              </label>
              <input
                type="datetime-local"
                disabled
                className="h-10 w-full cursor-not-allowed rounded-[10px] border px-3 text-sm opacity-70 outline-none"
                style={{ borderColor: principalColors.border, background: principalColors.surfaceMuted, color: principalColors.heading }}
              />
              <p className="mt-1.5 text-xs" style={{ color: principalColors.textFaint }}>
                Not wired yet — needs a background job to auto-publish at the scheduled time, not just a
                date field. Publishes immediately for now.
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-bold" style={{ color: principalColors.primary }}>
                Attachment
              </label>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => setAttachedFile(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-[10px] border border-dashed text-sm font-semibold"
                style={{ borderColor: principalColors.chipBorder, color: principalColors.primary }}
              >
                <Icon name="attach_file" size={16} />
                {attachedFile ? attachedFile.name : "Attach circular (optional)"}
              </button>
              {attachedFile && (
                <button type="button" onClick={() => setAttachedFile(null)} className="mt-1 text-xs font-semibold" style={{ color: principalColors.textFaint }}>
                  Remove attachment
                </button>
              )}
            </div>
          </div>

          {publishError && (
            <div className="text-sm" style={{ color: "#B42318" }}>
              Could not publish this announcement. Please try again.
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2.5 border-t px-6 py-4" style={{ borderColor: principalColors.borderLight, background: principalColors.surfaceMuted }}>
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-[10px] border px-4 text-sm font-semibold"
            style={{ borderColor: principalColors.border, background: principalColors.bg, color: principalColors.body }}
          >
            Cancel
          </button>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => publish("draft")}
              disabled={!canSubmit || publishing != null}
              className="flex h-10 items-center gap-2 rounded-[10px] border px-4 text-sm font-semibold disabled:opacity-50"
              style={{ borderColor: principalColors.border, background: principalColors.bg, color: principalColors.body }}
            >
              <Icon name="drafts" size={16} />
              {publishing === "draft" ? "Saving…" : "Save as draft"}
            </button>
            <button
              type="button"
              onClick={() => publish("published")}
              disabled={!canSubmit || publishing != null}
              className="h-10 rounded-[10px] px-4 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: principalColors.primary }}
            >
              {publishing === "published" ? "Publishing…" : "Publish now"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
