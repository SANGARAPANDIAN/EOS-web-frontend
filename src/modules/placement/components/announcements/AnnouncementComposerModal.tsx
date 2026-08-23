"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/modules/admin/components/ui/ToastProvider";
import { ApiError } from "@/types/api";
import { useDepartments } from "../../hooks/useDepartments";
import { useClasses } from "../../hooks/useClasses";
import { useBatches } from "../../hooks/useBatches";
import { useCreateAnnouncement, useUpdateAnnouncement } from "../../hooks/useAnnouncementMutations";
import { announcementFormSchema, type AnnouncementFormValues } from "../../schemas/announcement-form.schema";
import { ANNOUNCEMENT_CATEGORIES, type AnnouncementListItem, type CreateAnnouncementInput } from "../../types";

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

/**
 * Remounted (via a `key` on the caller side) every time the modal opens for
 * a different announcement — that's what makes fresh initial state here
 * safe without an effect: React never reuses this instance across targets.
 */
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
      const dept = deptById.get(c.departmentId);
      const deptName = dept ? `${dept.name} (${dept.code})` : `Department #${c.departmentId}`;
      const batchName = batchNameById.get(c.batchId) ?? `Batch #${c.batchId}`;
      const label = `${batchName} · Section ${c.section}${c.currentSemester ? ` · Sem ${c.currentSemester}` : ""}`;
      if (!byDept.has(c.departmentId)) byDept.set(c.departmentId, { deptName, classes: [] });
      byDept.get(c.departmentId)!.classes.push({ id: c.id, label });
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
      .catch((err: unknown) => show(err instanceof ApiError ? err.message : "Something went wrong.", "error"));
  }

  const isPending = createAnnouncement.isPending || updateAnnouncement.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-0">
      <div className="mb-3.5">
        <label className="mb-1 block text-[12.5px] font-semibold text-body">
          Headline <span className="text-danger-fg">*</span>
        </label>
        <Input
          placeholder="e.g. Pre-placement talk · 12 Aug · Main auditorium"
          className={errors.title ? "border-danger-border" : undefined}
          {...register("title")}
        />
        {errors.title && <p className="mt-1 text-[11.5px] text-danger-fg">{errors.title.message}</p>}
      </div>

      <div className="mb-3.5 grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-[12.5px] font-semibold text-body">Audience</label>
          <Select className={errors.targetAudience ? "border-danger-border" : undefined} {...register("targetAudience")}>
            {Object.entries(AUDIENCE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-[12.5px] font-semibold text-body">Category</label>
          <Select className={errors.category ? "border-danger-border" : undefined} {...register("category")}>
            <option value="">No category</option>
            {ANNOUNCEMENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c[0].toUpperCase() + c.slice(1)}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="mb-3.5">
        <label className="mb-1 block text-[12.5px] font-semibold text-body">
          Message <span className="text-danger-fg">*</span>
        </label>
        <Textarea rows={4} placeholder="Write the announcement in full" className={errors.content ? "border-danger-border" : undefined} {...register("content")} />
        {errors.content && <p className="mt-1 text-[11.5px] text-danger-fg">{errors.content.message}</p>}
      </div>

      <div className="mb-3.5 flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[12.5px] font-semibold text-body">
            Classes <span className="text-danger-fg">*</span>
          </label>
          <div className="flex items-center gap-3 text-xs font-semibold">
            <span className="text-subtle">
              {classIds.size} of {allClassIds.length} selected
            </span>
            <button type="button" onClick={selectAll} className="text-primary hover:underline">
              Select all
            </button>
            <button type="button" onClick={clearClasses} className="text-primary hover:underline">
              Clear
            </button>
          </div>
        </div>
        <div className="max-h-56 overflow-y-auto rounded-input border border-border-default p-2">
          {classes.isLoading || departments.isLoading ? (
            <div className="p-2 text-sm text-muted">Loading classes…</div>
          ) : (
            groups.map((g) => (
              <div key={g.deptName} className="mb-2 last:mb-0">
                <div className="flex items-center justify-between px-1 py-1">
                  <span className="text-xs font-bold tracking-wide text-subtle uppercase">{g.deptName}</span>
                  <button type="button" onClick={() => selectDept(g.classes.map((c) => c.id))} className="text-xs font-semibold text-primary hover:underline">
                    Select all
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {g.classes.map((c) => (
                    <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded-input px-2 py-1.5 text-sm hover:bg-surface-tint">
                      <input type="checkbox" checked={classIds.has(c.id)} onChange={() => toggleClass(c.id)} className="size-3.5" />
                      {c.label}
                    </label>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
        {classError && <p className="text-xs text-danger-fg">{classError}</p>}
      </div>

      <div className="mb-3.5">
        <label className="mb-1 block text-[12.5px] font-semibold text-body">Status</label>
        <Select {...register("status")}>
          <option value="published">Publish now</option>
          <option value="draft">Save as draft</option>
        </Select>
      </div>

      <div className="mt-1 flex justify-end gap-2.5 border-t border-border-default pt-3.5">
        <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" variant="primarySmall" disabled={isPending}>
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
      className="max-w-2xl"
    >
      {open && <AnnouncementComposerForm key={announcement?.id ?? "new"} announcement={announcement} onClose={onClose} />}
    </Modal>
  );
}
