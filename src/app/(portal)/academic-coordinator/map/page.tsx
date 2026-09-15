"use client";

import { useMemo, useState, type DragEvent } from "react";
import { useToast } from "@/modules/admin/components/ui/ToastProvider";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { ApiError } from "@/types/api";
import { useCourses, useDepartments } from "@/modules/academic-structure/hooks/useAcademicStructureQueries";
import { useDepartmentMapping } from "@/modules/academic-coordinator/hooks/useMappingQueries";
import { useAddMapping, useRemoveMapping } from "@/modules/academic-coordinator/hooks/useMappingMutations";
import { SUBJECT_COURSE_TYPE_LABELS, type MappingSubject } from "@/modules/academic-coordinator/types";

const DEFAULT_MAX_SEMESTER = 8;

export default function CoordinatorMapPage() {
  const { show } = useToast();
  const departments = useDepartments();
  const courses = useCourses();
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [poolDeptFilter, setPoolDeptFilter] = useState<string>("All");
  const [removing, setRemoving] = useState<{ semester: number; subject: MappingSubject } | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOverSemester, setDragOverSemester] = useState<number | null>(null);

  const effectiveDeptId = departmentId ?? departments.data?.[0]?.id ?? null;
  const mapping = useDepartmentMapping(effectiveDeptId);
  const addMapping = useAddMapping(effectiveDeptId);
  const removeMapping = useRemoveMapping(effectiveDeptId);

  const deptById = useMemo(() => new Map((departments.data ?? []).map((d) => [d.id, d])), [departments.data]);
  const maxSemester = useMemo(() => {
    const course = (courses.data ?? []).find((c) => c.department_id === effectiveDeptId);
    return course ? course.duration_years * 2 : DEFAULT_MAX_SEMESTER;
  }, [courses.data, effectiveDeptId]);

  const visibleSemesters = useMemo(
    () => (mapping.data?.semesters ?? []).filter((s) => s.semester <= maxSemester),
    [mapping.data, maxSemester],
  );

  const pool = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (mapping.data?.pool ?? []).filter((s) => {
      const matchesQuery = !q || s.subjectCode.toLowerCase().includes(q) || s.name.toLowerCase().includes(q);
      const matchesDept = poolDeptFilter === "All" || String(s.departmentId) === poolDeptFilter;
      return matchesQuery && matchesDept;
    });
  }, [mapping.data, search, poolDeptFilter]);

  function handleDragStart(e: DragEvent<HTMLDivElement>, subjectId: number) {
    e.dataTransfer.setData("text/plain", String(subjectId));
    e.dataTransfer.effectAllowed = "copy";
    setDraggingId(subjectId);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>, semester: number, totalClasses: number) {
    e.preventDefault();
    setDragOverSemester(null);
    setDraggingId(null);
    const subjectId = Number(e.dataTransfer.getData("text/plain"));
    if (!subjectId || effectiveDeptId == null) return;
    if (totalClasses === 0) {
      show("No classes sit at this semester for this department yet — nothing to map it to.", "error");
      return;
    }
    addMapping.mutate(
      { semester, subjectId },
      {
        onSuccess: (res) =>
          show(res.added > 0 ? `Mapped to ${res.added} class${res.added === 1 ? "" : "es"}.` : "Already mapped to every class here.", "success"),
        onError: (err: unknown) => show(err instanceof ApiError ? err.message : "Something went wrong. Please try again.", "error"),
      },
    );
  }

  function handleRemoveConfirmed() {
    if (!removing || removeMapping.isPending) return;
    removeMapping.mutate(
      { semester: removing.semester, subjectId: removing.subject.id },
      {
        onSuccess: () => show("Removed from mapping.", "success"),
        onError: (err: unknown) => show(err instanceof ApiError ? err.message : "Something went wrong. Please try again.", "error"),
        onSettled: () => setRemoving(null),
      },
    );
  }

  return (
    <div className="flex flex-col gap-4.5">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="m-0 text-[26px] font-bold tracking-[-.02em] text-ink">Course Mapping</h1>
          <p className="mt-1.5 text-[13px] text-muted">
            Drag a course from the pool onto a semester to map it — applies to every class at that semester, across every batch.
          </p>
        </div>
        <Select value={effectiveDeptId ?? ""} onChange={(e) => setDepartmentId(Number(e.target.value))} className="min-w-55">
          {(departments.data ?? []).map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} ({d.code})
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-[1fr_380px] items-start gap-4.5">
        {/* LEFT — semester buckets, one per semester of this department's program */}
        <div className="flex flex-col gap-3">
          {mapping.isLoading ? (
            <Card className="p-10 text-center text-[12.5px] text-subtle">Loading…</Card>
          ) : (
            visibleSemesters.map((bucket) => {
              const isDragOver = dragOverSemester === bucket.semester;
              const isEmpty = bucket.totalClasses === 0;
              return (
                <div
                  key={bucket.semester}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (!isEmpty) setDragOverSemester(bucket.semester);
                  }}
                  onDragLeave={() => setDragOverSemester((cur) => (cur === bucket.semester ? null : cur))}
                  onDrop={(e) => handleDrop(e, bucket.semester, bucket.totalClasses)}
                  className={`rounded-card border p-3.5 transition-[border-color,background] duration-150 ${
                    isEmpty ? "opacity-55" : ""
                  } ${isDragOver ? "border-2 border-dashed border-primary bg-accent-50" : "border-border-default bg-surface"}`}
                >
                  <div className="mb-2.5 flex items-center justify-between">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-bold text-ink">Semester {bucket.semester}</span>
                      <span className="text-[11px] text-subtle">
                        {isEmpty ? "no classes here" : `${bucket.totalClasses} class${bucket.totalClasses === 1 ? "" : "es"}`}
                      </span>
                    </div>
                    <span className="rounded-pill bg-accent-100 px-2 py-0.5 text-[11px] font-semibold text-primary">
                      {bucket.mapped.length} mapped
                    </span>
                  </div>

                  {bucket.mapped.length === 0 ? (
                    <div className="py-2.5 text-[11.5px] text-subtle">
                      {isEmpty ? "No class sits here — nothing to map." : "Drag a course here to map it."}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {bucket.mapped.map((s) => {
                        const partial = s.mappedClasses < bucket.totalClasses;
                        return (
                          <span
                            key={s.id}
                            title={`${s.name} — mapped to ${s.mappedClasses}/${bucket.totalClasses} classes`}
                            className={`inline-flex items-center gap-1.5 rounded-pill py-[5px] pr-[5px] pl-2.5 text-[11.5px] font-semibold ${
                              partial ? "bg-[#fef9c3] text-[#854d0e]" : "bg-surface-tint text-body"
                            }`}
                          >
                            {s.subjectCode}
                            {partial && (
                              <span className="font-bold">
                                {s.mappedClasses}/{bucket.totalClasses}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => setRemoving({ semester: bucket.semester, subject: s })}
                              aria-label={`Remove ${s.subjectCode}`}
                              className="flex size-4 items-center justify-center rounded-full bg-black/[.08] text-[10px] leading-4 text-inherit"
                            >
                              ×
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* RIGHT — full course pool, draggable, filterable, sticky while scrolling the semesters */}
        <Card className="sticky top-4.5 flex max-h-[calc(100vh-140px)] flex-col p-3.5">
          <h2 className="mb-2.5 shrink-0 text-[15px] font-bold text-ink">Course pool</h2>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search code or name"
            className="mb-2 h-[34px] shrink-0"
          />
          <Select value={poolDeptFilter} onChange={(e) => setPoolDeptFilter(e.target.value)} className="mb-2.5 h-[34px] w-full shrink-0">
            <option value="All">All departments</option>
            {(departments.data ?? []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.code}
              </option>
            ))}
          </Select>

          <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-0.5">
            {pool.length === 0 ? (
              <p className="py-5 text-center text-xs text-subtle">No courses match.</p>
            ) : (
              pool.map((s) => (
                <div
                  key={s.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, s.id)}
                  onDragEnd={() => setDraggingId(null)}
                  className={`cursor-grab rounded-input border border-border-default p-2.5 ${
                    draggingId === s.id ? "bg-accent-100 opacity-50" : "bg-surface"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12.5px] font-bold text-primary">{s.subjectCode}</span>
                    <span className="rounded-pill bg-surface-tint px-1.5 py-px text-[10px] font-semibold text-muted">
                      {deptById.get(s.departmentId ?? -1)?.code ?? "—"}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-body">{s.name}</div>
                  <div className="mt-1 text-[10.5px] text-subtle">
                    {s.credits ?? "—"} cr · {s.courseType ? SUBJECT_COURSE_TYPE_LABELS[s.courseType] : "—"}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <ConfirmDialog
        open={removing != null}
        title="Remove from mapping?"
        description={
          removing ? `${removing.subject.subjectCode} · ${removing.subject.name} will be unmapped from Semester ${removing.semester} in this department.` : undefined
        }
        confirmLabel="Remove"
        destructive
        onConfirm={handleRemoveConfirmed}
        onCancel={() => setRemoving(null)}
      />
    </div>
  );
}
