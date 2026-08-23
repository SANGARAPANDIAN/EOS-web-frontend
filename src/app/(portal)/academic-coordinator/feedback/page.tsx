"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/modules/admin/components/ui/ToastProvider";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ApiError } from "@/types/api";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { NumberedPagination } from "@/modules/admin/components/ui/NumberedPagination";
import { useBatches, useClasses, useCourses, useDepartments } from "@/modules/academic-structure/hooks/useAcademicStructureQueries";
import { useFeedbackForms } from "@/modules/academic-coordinator/hooks/useFeedbackQueries";
import { useDeleteFeedbackForm, usePublishFeedbackForm } from "@/modules/academic-coordinator/hooks/useFeedbackMutations";
import { FeedbackFormDialog } from "@/modules/academic-coordinator/components/FeedbackFormDialog";
import { EditFeedbackFormDialog } from "@/modules/academic-coordinator/components/EditFeedbackFormDialog";
import { FEEDBACK_COURSE_TYPE_LABELS, type FeedbackForm } from "@/modules/academic-coordinator/types";

const PAGE_SIZE = 10;

export default function FeedbackFormsPage() {
  const router = useRouter();
  const { show } = useToast();
  const [page, setPage] = useState(1);
  const [batchFilter, setBatchFilter] = useState<string>("all");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(null);
  const [publishingId, setPublishingId] = useState<number | null>(null);

  const departments = useDepartments();
  const courses = useCourses();
  const batches = useBatches();
  const classes = useClasses();
  const deleteForm = useDeleteFeedbackForm();
  const publishForm = usePublishFeedbackForm();

  const forms = useFeedbackForms({
    page,
    limit: PAGE_SIZE,
    batch_id: batchFilter === "all" ? undefined : Number(batchFilter),
    class_id: classFilter === "all" ? undefined : Number(classFilter),
  });

  const classLabel = useMemo(() => {
    const deptById = new Map((departments.data ?? []).map((d) => [d.id, d.code]));
    const courseById = new Map((courses.data ?? []).map((c) => [c.id, c.code]));
    const batchById = new Map((batches.data ?? []).map((b) => [b.id, b.name]));
    return (id: number) => {
      const c = (classes.data ?? []).find((x) => x.id === id);
      if (!c) return `Class #${id}`;
      return `${deptById.get(c.department_id) ?? "?"} · ${courseById.get(c.course_id) ?? "?"} · ${batchById.get(c.batch_id) ?? "?"} · Sec ${c.section}`;
    };
  }, [classes.data, departments.data, courses.data, batches.data]);

  function handlePublish(id: number) {
    if (publishingId != null) return;
    setPublishingId(id);
    publishForm
      .mutateAsync(id)
      .then(() => show("Feedback form published", "success"))
      .catch((err: unknown) => show(err instanceof ApiError ? err.message : "Something went wrong. Please try again.", "error"))
      .finally(() => setPublishingId(null));
  }

  function handleDelete(id: number) {
    if (deletingId != null) return;
    setDeletingId(id);
    deleteForm
      .mutateAsync(id)
      .then(() => {
        show("Feedback form deleted", "success");
      })
      .catch((err: unknown) => {
        show(err instanceof ApiError ? err.message : "Something went wrong. Please try again.", "error");
      })
      .finally(() => {
        setDeletingId(null);
        setConfirmingDeleteId(null);
      });
  }

  const columns: DataTableColumn<FeedbackForm>[] = [
    { key: "title", header: "TITLE", width: "2fr", render: (f) => <span className="font-bold text-ink">{f.title}</span> },
    {
      key: "target",
      header: "TARGET",
      width: "1.4fr",
      render: (f) => <>{f.class_id ? classLabel(f.class_id) : f.batchName ? `Batch: ${f.batchName}` : "—"}</>,
    },
    {
      key: "type",
      header: "TYPE",
      width: "1fr",
      render: (f) => <Badge tone="accent">{f.form_type === "end_semester" ? "End Semester" : "General"}</Badge>,
    },
    { key: "category", header: "CATEGORY", width: "1fr", render: (f) => <>{f.category ? FEEDBACK_COURSE_TYPE_LABELS[f.category] : "—"}</> },
    {
      key: "status",
      header: "STATUS",
      width: "0.8fr",
      render: (f) => <Badge tone={f.isPublished ? "accentDark" : "neutral"}>{f.isPublished ? "Published" : "Draft"}</Badge>,
    },
    { key: "questions", header: "QUESTIONS", width: "0.8fr", render: (f) => <>{f.questionCount}</> },
    {
      key: "created",
      header: "CREATED",
      width: "1fr",
      render: (f) => <>{new Date(f.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</>,
    },
    {
      key: "actions",
      header: "",
      width: "1.8fr",
      render: (f) => (
        <div className="flex flex-wrap justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          {!f.isPublished && (
            <Button variant="primarySmall" disabled={publishingId === f.id} onClick={() => handlePublish(f.id)}>
              {publishingId === f.id ? "Publishing…" : "Publish"}
            </Button>
          )}
          {f.isPublished ? (
            <Button variant="secondary" onClick={() => router.push(`/academic-coordinator/feedback/${f.id}`)}>
              Results
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => setEditingId(f.id)}>
              Edit
            </Button>
          )}
          <Button
            variant="secondary"
            className="border-danger-border text-danger-fg"
            disabled={deletingId === f.id}
            onClick={() => setConfirmingDeleteId(f.id)}
          >
            {deletingId === f.id ? "Deleting…" : "Delete"}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4.5">
      <div className="flex flex-wrap items-end gap-5">
        <div className="min-w-70 flex-1">
          <h1 className="m-0 text-[26px] font-bold tracking-[-.02em] text-ink">Feedback</h1>
          <p className="mt-1.5 text-[13px] text-muted">Create and manage general or end-of-semester faculty rating feedback forms. All responses are anonymous.</p>
        </div>
        <Button variant="primarySmall" onClick={() => setCreateOpen(true)}>
          + New form
        </Button>
      </div>

      <DataTable
        title="Feedback forms"
        titleNote={
          <div className="flex gap-2.5">
            <Select
              value={batchFilter}
              onChange={(e) => {
                setBatchFilter(e.target.value);
                setPage(1);
              }}
              className="h-[34px]"
            >
              <option value="all">All batches</option>
              {(batches.data ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
            <Select
              value={classFilter}
              onChange={(e) => {
                setClassFilter(e.target.value);
                setPage(1);
              }}
              className="h-[34px]"
            >
              <option value="all">All classes</option>
              {(classes.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {classLabel(c.id)}
                </option>
              ))}
            </Select>
          </div>
        }
        columns={columns}
        data={forms.data?.data ?? []}
        rowKey={(f) => f.id}
        loading={forms.isLoading}
        hoverableRows
        onRowClick={(f) => (f.isPublished ? router.push(`/academic-coordinator/feedback/${f.id}`) : setEditingId(f.id))}
        emptyMessage="No feedback forms yet. Create one to get started."
      />
      <NumberedPagination page={page} pageSize={PAGE_SIZE} total={forms.data?.meta.total ?? 0} onPageChange={setPage} />

      <FeedbackFormDialog open={createOpen} onClose={() => setCreateOpen(false)} />

      <EditFeedbackFormDialog key={editingId ?? "none"} formId={editingId} onClose={() => setEditingId(null)} />

      <ConfirmDialog
        open={confirmingDeleteId != null}
        title="Delete feedback form?"
        description="This permanently removes the form and its questions. Forms that already have student responses cannot be deleted."
        confirmLabel="Delete"
        destructive
        onConfirm={() => confirmingDeleteId != null && handleDelete(confirmingDeleteId)}
        onCancel={() => setConfirmingDeleteId(null)}
      />
    </div>
  );
}
