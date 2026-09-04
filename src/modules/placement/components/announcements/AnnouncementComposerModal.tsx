"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal, Button, FormField, Input, Select, Textarea, Checkbox, useToast } from "@/modules/admin/components/ui";
import { friendlyError } from "@/lib/utils/errors";
import { useClasses } from "@/modules/admin/api/refData";
import { useDepartments } from "@/modules/shared/api/departments";
import { useBatches } from "@/modules/placement/api/refData";
import {
  ANNOUNCEMENT_CATEGORIES,
  useCreateAnnouncement,
  useUpdateAnnouncement,
  type AnnouncementListItem,
  type CreateAnnouncementInput,
} from "@/modules/placement/api/announcements";
import { announcementFormSchema, type AnnouncementFormValues } from "@/modules/placement/schemas/announcement-form.schema";

interface AnnouncementComposerModalProps {
  open: boolean;
  announcement: AnnouncementListItem | null;
  onClose: () => void;
}

const AUDIENCE_LABEL: Record<string, string> = {
  students: "Students",
  teachers: "Faculty / HODs",
  parents: "Parents",
};

function toDefaults(a: AnnouncementListItem | null): AnnouncementFormValues {
  return {
    title: a?.title ?? "",
    content: a?.content ?? "",
    targetAudience: a && a.targetAudience !== "roles" ? a.targetAudience : "students",
    category: (a?.category as AnnouncementFormValues["category"]) ?? undefined,
    status: a?.status ?? "published",
  };
}

/** Remounted via a `key` on the caller for each target — fresh local state (classIds) is safe without an effect since React never reuses this instance across announcements. */
function AnnouncementComposerForm({ announcement, onClose }: { announcement: AnnouncementListItem | null; onClose: () => void }) {
  const { show } = useToast();
  const isEditing = announcement !== null;

  const departments = useDepartments();
  const classes = useClasses();
  const batches = useBatches();
  const createAnnouncement = useCreateAnnouncement();
  const updateAnnouncement = useUpdateAnnouncement();

  const [classIds, setClassIds] = useState<Set<number>>(() => new Set(announcement?.classIds ?? []));
  const [classError, setClassError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AnnouncementFormValues>({
    resolver: zodResolver(announcementFormSchema),
    defaultValues: toDefaults(announcement),
  });

  const batchNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const b of batches.data ?? []) map.set(b.id, b.name);
    return map;
  }, [batches.data]);

  // Every real class grouped under its real department — an officer picks
  // concrete classes rather than a fictional "audience preset", since
  // CreateAnnouncementDto's class_ids is what's actually persisted.
  const groups = useMemo(() => {
    const deptById = new Map((departments.data ?? []).map((d) => [d.id, d]));
    const byDept = new Map<number, { deptName: string; classes: { id: number; label: string }[] }>();
    for (const c of classes.data ?? []) {
      const dept = deptById.get(c.department_id);
      const deptName = dept ? `${dept.name} (${dept.code})` : `Department #${c.department_id}`;
      const batchName = batchNameById.get(c.batch_id) ?? `Batch #${c.batch_id}`;
      const label = `${batchName} · Section ${c.section}${c.current_semester ? ` · Sem ${c.current_semester}` : ""}`;
      if (!byDept.has(c.department_id)) byDept.set(c.department_id, { deptName, classes: [] });
      byDept.get(c.department_id)!.classes.push({ id: c.id, label });
    }
    return Array.from(byDept.values()).sort((a, b) => a.deptName.localeCompare(b.deptName));
  }, [departments.data, classes.data, batchNameById]);

  const allClassIds = useMemo(() => (classes.data ?? []).map((c) => c.id), [classes.data]);

  function toggleClass(id: number) {
    setClassIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setClassError(null);
  }

  function selectAll() {
    setClassIds(new Set(allClassIds));
    setClassError(null);
  }

  function selectDept(ids: number[]) {
    setClassIds((prev) => new Set([...prev, ...ids]));
    setClassError(null);
  }

  function clearClasses() {
    setClassIds(new Set());
  }

  function onSubmit(values: AnnouncementFormValues) {
    if (classIds.size === 0) {
      setClassError("Select at least one class to reach.");
      return;
    }

    const input: CreateAnnouncementInput = {
      title: values.title,
      content: values.content,
      targetAudience: values.targetAudience,
      classIds: Array.from(classIds),
      status: values.status,
      category: values.category || undefined,
    };

    const mutation = isEditing
      ? updateAnnouncement.mutateAsync({ id: announcement.id, input })
      : createAnnouncement.mutateAsync(input);

    mutation
      .then(() => {
        show(isEditing ? "Announcement updated." : "Announcement published.", "success");
        onClose();
      })
      .catch((err: unknown) => show(friendlyError(err), "error"));
  }

  const isPending = createAnnouncement.isPending || updateAnnouncement.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <FormField label="Headline" error={errors.title?.message}>
        <Input placeholder="e.g. Pre-placement talk · 12 Aug · Main auditorium" {...register("title")} />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Audience" error={errors.targetAudience?.message}>
          <Select {...register("targetAudience")}>
            {Object.entries(AUDIENCE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Category" error={errors.category?.message}>
          <Select {...register("category")}>
            <option value="">No category</option>
            {ANNOUNCEMENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c[0].toUpperCase() + c.slice(1)}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      <FormField label="Message" error={errors.content?.message}>
        <Textarea rows={4} placeholder="Write the announcement in full" {...register("content")} />
      </FormField>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label className="text-sm font-bold text-admin-primary">
            Classes <span className="ml-0.5 text-admin-danger">*</span>
          </label>
          <div className="flex items-center gap-3 text-xs font-semibold">
            <span className="text-admin-muted">
              {classIds.size} of {allClassIds.length} selected
            </span>
            <button type="button" onClick={selectAll} className="text-admin-primary hover:underline">
              Select all
            </button>
            <button type="button" onClick={clearClasses} className="text-admin-primary hover:underline">
              Clear
            </button>
          </div>
        </div>
        <div className="max-h-56 overflow-y-auto rounded-admin-lg border border-admin-border p-2">
          {classes.isLoading || departments.isLoading ? (
            <div className="p-2 text-sm text-admin-muted">Loading classes…</div>
          ) : (
            groups.map((g) => (
              <div key={g.deptName} className="mb-2 last:mb-0">
                <div className="flex items-center justify-between px-1 py-1">
                  <span className="text-xs font-bold tracking-wide text-admin-muted uppercase">{g.deptName}</span>
                  <button
                    type="button"
                    onClick={() => selectDept(g.classes.map((c) => c.id))}
                    className="text-xs font-semibold text-admin-primary hover:underline"
                  >
                    Select all
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {g.classes.map((c) => (
                    <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded-admin-sm px-2 py-1.5 text-sm hover:bg-admin-tint">
                      <Checkbox checked={classIds.has(c.id)} onChange={() => toggleClass(c.id)} />
                      {c.label}
                    </label>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
        {classError && <p className="text-[13px] text-admin-danger">{classError}</p>}
      </div>

      <FormField label="Status" error={errors.status?.message}>
        <Select {...register("status")}>
          <option value="published">Publish now</option>
          <option value="draft">Save as draft</option>
        </Select>
      </FormField>

      <div className="mt-2 flex justify-end gap-2 border-t border-admin-divider pt-4">
        <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={isPending}>
          {isPending ? "Saving…" : isEditing ? "Save changes" : "Publish announcement"}
        </Button>
      </div>
    </form>
  );
}

export function AnnouncementComposerModal({ open, announcement, onClose }: AnnouncementComposerModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={announcement ? "Edit announcement" : "New announcement"}
      subtitle="Circulars and posts reach the classes you select below."
      widthClassName="max-w-2xl"
    >
      {open && <AnnouncementComposerForm key={announcement?.id ?? "new"} announcement={announcement} onClose={onClose} />}
    </Modal>
  );
}
