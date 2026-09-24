"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/modules/admin/components/ui/ToastProvider";
import { ApiError } from "@/types/api";
import { useCreateCourse, useUpdateCourse } from "../hooks/useAcademicStructureMutations";
import type { Course, Department } from "../types";

interface CourseDialogProps {
  open: boolean;
  onClose: () => void;
  department: Department;
  /** Omit to create a new course under `department`; pass one to edit it. */
  course?: Course;
}

const DURATION_OPTIONS = [2, 3, 4, 5, 6];

export function CourseDialog({ open, onClose, department, course }: CourseDialogProps) {
  const [name, setName] = useState(course?.name ?? "");
  const [code, setCode] = useState(course?.code ?? "");
  const [durationYears, setDurationYears] = useState(String(course?.duration_years ?? 4));
  const [error, setError] = useState<string | null>(null);
  const createCourse = useCreateCourse();
  const updateCourse = useUpdateCourse();
  const { show } = useToast();

  const pending = createCourse.isPending || updateCourse.isPending;

  function handleSave() {
    setError(null);
    const trimmedName = name.trim();
    const trimmedCode = code.trim().toUpperCase();
    if (!trimmedName) return setError("Course name is required.");
    if (!trimmedCode) return setError("Course code is required.");

    const mutation = course
      ? updateCourse.mutateAsync({
          id: course.id,
          input: { name: trimmedName, code: trimmedCode, duration_years: Number(durationYears) },
        })
      : createCourse.mutateAsync({
          name: trimmedName,
          code: trimmedCode,
          department_id: department.id,
          duration_years: Number(durationYears),
        });

    mutation
      .then(() => {
        show(course ? "Course updated" : "Course created", "success");
        onClose();
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={course ? "Edit course" : "Add course"}
      subtitle={`${department.name} (${department.code})`}
      className="max-w-lg"
    >
      <div className="mb-3.5">
        <label className="mb-1 block text-[12.5px] font-semibold text-body">Name *</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="B.E. Civil Engineering" maxLength={150} />
      </div>
      <div className="flex gap-2.5">
        <div className="mb-3.5 flex-1">
          <label className="mb-1 block text-[12.5px] font-semibold text-body">Code *</label>
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="CIVIL" maxLength={20} />
        </div>
        <div className="mb-3.5 flex-1">
          <label className="mb-1 block text-[12.5px] font-semibold text-body">Duration</label>
          <Select value={durationYears} onChange={(e) => setDurationYears(e.target.value)}>
            {DURATION_OPTIONS.map((y) => (
              <option key={y} value={y}>
                {y} years
              </option>
            ))}
          </Select>
        </div>
      </div>
      {error && <p className="mt-1 text-[11.5px] text-danger-fg">{error}</p>}

      <div className="mt-4.5 flex justify-end gap-2.5 border-t border-border-default pt-3.5">
        <Button variant="secondary" className="w-auto px-4 py-2.5" onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        <Button variant="primarySmall" onClick={handleSave} disabled={pending}>
          {pending ? "Saving…" : course ? "Save changes" : "Create course"}
        </Button>
      </div>
    </Modal>
  );
}
