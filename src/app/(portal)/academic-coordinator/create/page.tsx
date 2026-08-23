"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { useToast } from "@/modules/admin/components/ui/ToastProvider";
import { ApiError } from "@/types/api";
import { useDepartments } from "@/modules/academic-structure/hooks/useAcademicStructureQueries";
import { useSubjects } from "@/modules/academic-coordinator/hooks/useSubjectsQueries";
import { useCreateSubject, useDeleteSubject, useUpdateSubject } from "@/modules/academic-coordinator/hooks/useSubjectsMutations";
import {
  SUBJECT_CATEGORY_LABELS,
  SUBJECT_COURSE_TYPE_LABELS,
  type Subject,
  type SubjectCategory,
  type SubjectCourseType,
} from "@/modules/academic-coordinator/types";

const COURSE_TYPES: SubjectCourseType[] = ["THEORY", "PRACTICAL", "THEORY_WITH_PRACTICAL", "PROJECT", "MANDATORY", "AUDIT"];
const CATEGORIES: SubjectCategory[] = ["CORE", "ELECTIVE", "OPEN_ELECTIVE", "MANDATORY", "VALUE_ADDED"];

interface FormState {
  shortCode: string;
  code: string;
  name: string;
  credits: string;
  type: SubjectCourseType | "";
  category: SubjectCategory | "";
  departmentId: string;
  hours: string;
}

const EMPTY_FORM: FormState = { shortCode: "", code: "", name: "", credits: "", type: "", category: "", departmentId: "", hours: "" };

function formatAdded(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function CreateCoursePage() {
  const { show } = useToast();
  const departments = useDepartments();
  const subjects = useSubjects();
  const createSubject = useCreateSubject();
  const updateSubject = useUpdateSubject();
  const deleteSubject = useDeleteSubject();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState<string>("All");
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(null);

  const deptById = useMemo(() => new Map((departments.data ?? []).map((d) => [d.id, d])), [departments.data]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function validate(): Partial<Record<keyof FormState, string>> {
    const e: Partial<Record<keyof FormState, string>> = {};
    const code = form.code.trim().toUpperCase();
    if (!code) e.code = "Course code is required.";
    else if ((subjects.data ?? []).some((s) => s.subjectCode === code && s.id !== editingId)) e.code = "This course code already exists.";
    if (!form.name.trim()) e.name = "Subject name is required.";
    const credits = Number(form.credits);
    if (form.credits === "" || Number.isNaN(credits)) e.credits = "Credits are required.";
    else if (!Number.isInteger(credits) || credits < 1 || credits > 10) e.credits = "Credits must be a whole number between 1 and 10.";
    if (!form.shortCode.trim()) e.shortCode = "Short name is required.";
    if (!form.type) e.type = "Select a course type.";
    if (!form.category) e.category = "Select a category.";
    if (!form.departmentId) e.departmentId = "Select a department.";
    const hours = Number(form.hours);
    if (form.hours === "" || Number.isNaN(hours)) e.hours = "Number of hours is required.";
    else if (!Number.isInteger(hours) || hours < 1 || hours > 120) e.hours = "Hours must be a whole number between 1 and 120.";
    return e;
  }

  function handleSubmit() {
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const input = {
      name: form.name.trim(),
      subject_code: form.code.trim().toUpperCase(),
      short_code: form.shortCode.trim().toUpperCase(),
      course_type: form.type as SubjectCourseType,
      category: form.category as SubjectCategory,
      department_id: Number(form.departmentId),
      hours: Number(form.hours),
      credits: Number(form.credits),
    };

    const mutation = editingId != null ? updateSubject.mutateAsync({ id: editingId, input }) : createSubject.mutateAsync(input);

    mutation
      .then(() => {
        show(editingId != null ? "Course updated successfully" : "Course created successfully", "success");
        setForm(EMPTY_FORM);
        setEditingId(null);
        setErrors({});
      })
      .catch((err: unknown) => {
        const message = err instanceof ApiError ? err.message : "Something went wrong. Please try again.";
        if (err instanceof ApiError && err.errorCode === "SUBJECT_CODE_EXISTS") setErrors((prev) => ({ ...prev, code: message }));
        else show(message, "error");
      });
  }

  function handleEdit(s: Subject) {
    setForm({
      shortCode: s.shortCode ?? "",
      code: s.subjectCode,
      name: s.name,
      credits: s.credits != null ? String(s.credits) : "",
      type: s.courseType ?? "",
      category: s.category ?? "",
      departmentId: s.departmentId != null ? String(s.departmentId) : "",
      hours: s.hours != null ? String(s.hours) : "",
    });
    setEditingId(s.id);
    setErrors({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleCancelEdit() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setErrors({});
  }

  function handleDelete(id: number) {
    if (deletingId != null) return;
    setDeletingId(id);
    deleteSubject
      .mutateAsync(id)
      .then(() => show("Course deleted", "success"))
      .catch((err: unknown) => show(err instanceof ApiError ? err.message : "Something went wrong.", "error"))
      .finally(() => {
        setDeletingId(null);
        setConfirmingDeleteId(null);
      });
  }

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (subjects.data ?? []).filter((s) => {
      const matchesQuery = !q || s.subjectCode.toLowerCase().includes(q) || s.name.toLowerCase().includes(q);
      const matchesDept = deptFilter === "All" || String(s.departmentId) === deptFilter;
      return matchesQuery && matchesDept;
    });
  }, [subjects.data, search, deptFilter]);

  const total = subjects.data?.length ?? 0;
  const resultBadge = filteredRows.length === total ? `${total} courses` : `${filteredRows.length} of ${total}`;
  const viewingSubject = viewingId != null ? ((subjects.data ?? []).find((s) => s.id === viewingId) ?? null) : null;
  const deletingSubject = confirmingDeleteId != null ? ((subjects.data ?? []).find((s) => s.id === confirmingDeleteId) ?? null) : null;
  const isPending = createSubject.isPending || updateSubject.isPending;

  const columns: DataTableColumn<Subject>[] = [
    { key: "shortCode", header: "SHORT NAME", width: "0.8fr", render: (s) => <>{s.shortCode ?? "—"}</> },
    { key: "code", header: "COURSE CODE", width: "1fr", render: (s) => <span className="font-bold text-primary">{s.subjectCode}</span> },
    { key: "name", header: "SUBJECT NAME", width: "1.8fr", render: (s) => <>{s.name}</> },
    { key: "credits", header: "CREDITS", width: "0.6fr", render: (s) => <>{s.credits ?? "—"}</> },
    { key: "type", header: "TYPE", width: "1.1fr", render: (s) => <span className="text-muted">{s.courseType ? SUBJECT_COURSE_TYPE_LABELS[s.courseType] : "—"}</span> },
    { key: "category", header: "CAT", width: "0.9fr", render: (s) => <span className="text-muted">{s.category ? SUBJECT_CATEGORY_LABELS[s.category] : "—"}</span> },
    {
      key: "department",
      header: "DEPARTMENT",
      width: "0.9fr",
      render: (s) => <>{s.departmentId != null ? (deptById.get(s.departmentId)?.code ?? "—") : "—"}</>,
    },
    { key: "hours", header: "HOURS", width: "0.7fr", render: (s) => <>{s.hours ?? "—"}</> },
    {
      key: "actions",
      header: "ACTIONS",
      width: "1.6fr",
      render: (s) => (
        <div className="flex items-center gap-3">
          <Button type="button" variant="text" onClick={() => setViewingId(s.id)}>
            View
          </Button>
          <Button type="button" variant="text" onClick={() => handleEdit(s)}>
            Edit
          </Button>
          <Button
            type="button"
            variant="text"
            className="text-danger-fg border-danger-border"
            disabled={deletingId === s.id}
            onClick={() => setConfirmingDeleteId(s.id)}
          >
            {deletingId === s.id ? "Deleting…" : "Delete"}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4.5">
      <Card>
        <h2 className="m-0 mb-4 text-[18px] font-extrabold tracking-[-.02em] text-ink">{editingId != null ? "Edit Course" : "Create Course"}</h2>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-x-3.5">
          <div className="mb-3.5">
            <label className="mb-1 block text-[12.5px] font-semibold text-body">Short Name</label>
            <Input
              value={form.shortCode}
              onChange={(e) => update("shortCode", e.target.value)}
              placeholder="e.g. CO1"
              className={errors.shortCode ? "border-danger-border" : undefined}
            />
            {errors.shortCode && <p className="mt-1 text-[11.5px] text-danger-fg">{errors.shortCode}</p>}
          </div>
          <div className="mb-3.5">
            <label className="mb-1 block text-[12.5px] font-semibold text-body">Course code</label>
            <Input
              value={form.code}
              onChange={(e) => update("code", e.target.value)}
              placeholder="e.g. AD3491"
              className={errors.code ? "border-danger-border" : undefined}
            />
            {errors.code && <p className="mt-1 text-[11.5px] text-danger-fg">{errors.code}</p>}
          </div>
          <div className="mb-3.5">
            <label className="mb-1 block text-[12.5px] font-semibold text-body">Subject name</label>
            <Input
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="e.g. Fundamentals of Data Science"
              className={errors.name ? "border-danger-border" : undefined}
            />
            {errors.name && <p className="mt-1 text-[11.5px] text-danger-fg">{errors.name}</p>}
          </div>
          <div className="mb-3.5">
            <label className="mb-1 block text-[12.5px] font-semibold text-body">Credits</label>
            <Input
              type="number"
              min={1}
              max={10}
              value={form.credits}
              onChange={(e) => update("credits", e.target.value)}
              placeholder="1 – 10"
              className={errors.credits ? "border-danger-border" : undefined}
            />
            {errors.credits && <p className="mt-1 text-[11.5px] text-danger-fg">{errors.credits}</p>}
          </div>
          <div className="mb-3.5">
            <label className="mb-1 block text-[12.5px] font-semibold text-body">Type</label>
            <Select
              value={form.type}
              onChange={(e) => update("type", e.target.value as SubjectCourseType)}
              className={errors.type ? "border-danger-border" : undefined}
            >
              <option value="">Select type</option>
              {COURSE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {SUBJECT_COURSE_TYPE_LABELS[t]}
                </option>
              ))}
            </Select>
            {errors.type && <p className="mt-1 text-[11.5px] text-danger-fg">{errors.type}</p>}
          </div>
          <div className="mb-3.5">
            <label className="mb-1 block text-[12.5px] font-semibold text-body">Category</label>
            <Select
              value={form.category}
              onChange={(e) => update("category", e.target.value as SubjectCategory)}
              className={errors.category ? "border-danger-border" : undefined}
            >
              <option value="">Select</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {SUBJECT_CATEGORY_LABELS[c]}
                </option>
              ))}
            </Select>
            {errors.category && <p className="mt-1 text-[11.5px] text-danger-fg">{errors.category}</p>}
          </div>
          <div className="mb-3.5">
            <label className="mb-1 block text-[12.5px] font-semibold text-body">Department</label>
            <Select
              value={form.departmentId}
              onChange={(e) => update("departmentId", e.target.value)}
              className={errors.departmentId ? "border-danger-border" : undefined}
            >
              <option value="">Select department</option>
              {(departments.data ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code}
                </option>
              ))}
            </Select>
            {errors.departmentId && <p className="mt-1 text-[11.5px] text-danger-fg">{errors.departmentId}</p>}
          </div>
          <div className="mb-3.5">
            <label className="mb-1 block text-[12.5px] font-semibold text-body">No. of hours</label>
            <Input
              type="number"
              min={1}
              max={120}
              value={form.hours}
              onChange={(e) => update("hours", e.target.value)}
              placeholder="e.g. 45"
              className={errors.hours ? "border-danger-border" : undefined}
            />
            {errors.hours && <p className="mt-1 text-[11.5px] text-danger-fg">{errors.hours}</p>}
          </div>
        </div>

        <div className="flex gap-2.5">
          <Button type="button" variant="primarySmall" onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Saving…" : editingId != null ? "Save changes" : "Submit"}
          </Button>
          {editingId != null && (
            <Button type="button" variant="secondary" className="w-auto" onClick={handleCancelEdit} disabled={isPending}>
              Cancel
            </Button>
          )}
        </div>
      </Card>

      {total === 0 ? (
        <Card className="p-12 text-center">
          <h3 className="m-0 mb-1.5 text-[16px] font-bold text-ink">No Courses Created Yet</h3>
          <p className="m-0 text-[13px] text-muted">Courses you create will appear here as a searchable register.</p>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <h2 className="m-0 text-[16.5px] font-bold text-ink">Created Courses</h2>
              <Badge tone="accent">{resultBadge}</Badge>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by course code or subject name"
                className="min-w-65"
              />
              <Select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="min-w-35">
                <option value="All">All departments</option>
                {(departments.data ?? []).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <DataTable
            columns={columns}
            data={filteredRows}
            rowKey={(s) => s.id}
            loading={subjects.isLoading}
            emptyMessage="No matching courses. Adjust the search text or department filter."
          />
        </>
      )}

      <Modal open={viewingSubject != null} onClose={() => setViewingId(null)} title="Course details" className="max-w-md">
        {viewingSubject && (
          <div className="flex flex-col gap-2.5">
            {(
              [
                ["Short name", viewingSubject.shortCode ?? "—"],
                ["Category", viewingSubject.category ? SUBJECT_CATEGORY_LABELS[viewingSubject.category] : "—"],
                ["Course code", viewingSubject.subjectCode],
                ["Subject name", viewingSubject.name],
                ["Credits", String(viewingSubject.credits ?? "—")],
                ["Type", viewingSubject.courseType ? SUBJECT_COURSE_TYPE_LABELS[viewingSubject.courseType] : "—"],
                ["Department", viewingSubject.departmentId != null ? (deptById.get(viewingSubject.departmentId)?.code ?? "—") : "—"],
                ["No. of hours", String(viewingSubject.hours ?? "—")],
                ["Added on", formatAdded(viewingSubject.createdAt)],
              ] as [string, string][]
            ).map(([label, value]) => (
              <div key={label} className="flex items-center justify-between border-b border-divider pb-2 text-[13px]">
                <span className="text-muted">{label}</span>
                <span className="font-semibold text-ink">{value}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={confirmingDeleteId != null}
        title="Delete this course?"
        description={
          deletingSubject
            ? `${deletingSubject.subjectCode} · ${deletingSubject.name} will be removed from the curriculum register. This cannot be undone.`
            : undefined
        }
        confirmLabel="Delete course"
        destructive
        onConfirm={() => confirmingDeleteId != null && handleDelete(confirmingDeleteId)}
        onCancel={() => setConfirmingDeleteId(null)}
      />
    </div>
  );
}
