"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/modules/admin/components/ui/ToastProvider";
import { ApiError } from "@/types/api";
import { useStudentCount } from "../hooks/useStudentCount";
import { useClassSubjects } from "../hooks/useAcademicStructureQueries";
import { useDeleteClass, useUpdateClass } from "../hooks/useAcademicStructureMutations";
import { CannotDeleteModal } from "./CannotDeleteModal";
import { formatBlockers } from "../lib/formatBlockers";
import type { Batch, Course, SchoolClass } from "../types";

interface ClassDialogProps {
  open: boolean;
  onClose: () => void;
  classItem: SchoolClass;
  course: Course;
  batches: Batch[];
  classes: SchoolClass[];
}

export function ClassDialog({ open, onClose, classItem, course, batches, classes }: ClassDialogProps) {
  const { data: studentCountInClass = 0 } = useStudentCount({ class_id: classItem.id });
  const [batchId, setBatchId] = useState(String(classItem.batch_id));
  const [section, setSection] = useState(classItem.section);
  const [semester, setSemester] = useState(classItem.current_semester != null ? String(classItem.current_semester) : "");
  const [error, setError] = useState<string | null>(null);
  const [blockers, setBlockers] = useState<string[] | null>(null);
  const updateClass = useUpdateClass();
  const deleteClass = useDeleteClass();
  const { data: subjects } = useClassSubjects(classItem.id);
  const { show } = useToast();

  const takenSections = useMemo(
    () =>
      new Set(
        classes
          .filter((c) => c.course_id === course.id && c.batch_id === Number(batchId) && c.id !== classItem.id)
          .map((c) => c.section),
      ),
    [classes, course.id, batchId, classItem.id],
  );

  function handleSave() {
    setError(null);
    const trimmedSection = section.trim().toUpperCase();
    if (!trimmedSection) return setError("Section is required.");
    if (trimmedSection.length > 10) return setError("10 characters max.");
    if (!/^[A-Z0-9]+$/.test(trimmedSection)) return setError("Letters and numbers only.");
    if (takenSections.has(trimmedSection)) return setError(`Section ${trimmedSection} already exists for this batch.`);

    updateClass
      .mutateAsync({
        id: classItem.id,
        input: { batch_id: Number(batchId), section: trimmedSection, current_semester: semester ? Number(semester) : undefined },
      })
      .then(() => {
        show("Class updated", "success");
        onClose();
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      });
  }

  function handleDelete() {
    deleteClass
      .mutateAsync(classItem.id)
      .then(() => {
        show("Deleted", "success");
        onClose();
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.details) {
          setBlockers(formatBlockers(err.details));
        } else {
          show(err instanceof ApiError ? err.message : "Something went wrong. Please try again.", "error");
        }
      });
  }

  const semesterOptions = Array.from({ length: course.duration_years * 2 }, (_, i) => i + 1);
  const bySemester = new Map<number, typeof subjects>();
  (subjects ?? []).forEach((s) => {
    const list = bySemester.get(s.semester) ?? [];
    list.push(s);
    bySemester.set(s.semester, list);
  });

  return (
    <>
      <Modal open={open} onClose={onClose} title="Edit class" subtitle={`${course.code} · Section ${classItem.section}`} className="max-w-lg">
        <div className="mb-3.5">
          <label className="mb-1 block text-[12.5px] font-semibold text-body">Batch *</label>
          <Select value={batchId} onChange={(e) => setBatchId(e.target.value)}>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex gap-2.5">
          <div className="mb-3.5 flex-1">
            <label className="mb-1 block text-[12.5px] font-semibold text-body">Section *</label>
            <Input value={section} onChange={(e) => setSection(e.target.value)} maxLength={10} />
          </div>
          <div className="mb-3.5 flex-1">
            <label className="mb-1 block text-[12.5px] font-semibold text-body">Current semester</label>
            <Select value={semester} onChange={(e) => setSemester(e.target.value)}>
              <option value="">Not set</option>
              {semesterOptions.map((s) => (
                <option key={s} value={s}>
                  Semester {s}
                </option>
              ))}
            </Select>
          </div>
        </div>
        {studentCountInClass > 0 && (
          <p className="mt-1 text-[11px] text-subtle">
            {studentCountInClass} student{studentCountInClass === 1 ? "" : "s"} on the roll sits in this class.
            Renaming the section moves all of them.
          </p>
        )}
        {error && <p className="mt-1 text-[11.5px] text-danger-fg">{error}</p>}

        {bySemester.size > 0 && (
          <div className="mt-4 border-t border-divider pt-3.5">
            <p className="mb-2 text-[11px] font-extrabold tracking-[.06em] text-subtle uppercase">Subjects (read-only)</p>
            <div className="flex max-h-40 flex-col gap-2 overflow-y-auto">
              {Array.from(bySemester.entries())
                .sort(([a], [b]) => a - b)
                .map(([sem, list]) => (
                  <div key={sem}>
                    <p className="mb-1 text-[11px] font-semibold text-muted">Semester {sem}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {list?.map((s) => (
                        <Badge key={s.id} tone={s.is_elective ? "accent" : "neutral"}>
                          {s.subjects.subject_code} · {s.subjects.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        <div className="mt-4.5 flex items-center justify-between border-t border-border-default pt-3.5">
          <Button
            variant="secondary"
            className="w-auto border-danger-border px-3.5 py-2 text-danger-fg"
            title={studentCountInClass > 0 ? `${studentCountInClass} students in this class — move them first` : "Delete this class"}
            disabled={studentCountInClass > 0 || deleteClass.isPending}
            onClick={handleDelete}
          >
            {deleteClass.isPending ? "Deleting…" : "Delete"}
          </Button>
          <div className="flex gap-2.5">
            <Button variant="secondary" className="w-auto px-4 py-2.5" onClick={onClose} disabled={updateClass.isPending}>
              Cancel
            </Button>
            <Button variant="primarySmall" onClick={handleSave} disabled={updateClass.isPending}>
              {updateClass.isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      </Modal>

      {blockers && <CannotDeleteModal open={!!blockers} onClose={() => setBlockers(null)} label="class" blockers={blockers} />}
    </>
  );
}
