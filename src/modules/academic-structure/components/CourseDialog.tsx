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
  course: Course | null;
  departments: Department[];
  /** Preselected department when adding from a department's own panel. */
  defaultDepartmentId: number | null;
}

export function CourseDialog({ open, onClose, course, departments, defaultDepartmentId }: CourseDialogProps) {
  const [name, setName] = useState(course?.name ?? "");
  const [code, setCode] = useState(course?.code ?? "");
  const [departmentId, setDepartmentId] = useState<string>(
    course ? String(course.department_id) : defaultDepartmentId != null ? String(defaultDepartmentId) : "",
  );
  const [durationYears, setDurationYears] = useState(course?.duration_years ?? 4);
  const [error, setError] = useState<string | null>(null);
  const createCourse = useCreateCourse();
  const updateCourse = useUpdateCourse();
  const { show } = useToast();

  const pending = createCourse.isPending || updateCourse.isPending;

  function handleSave() {
    setError(null);
    const trimmedName = name.trim();
    const trimmedCode = code.trim().toUpperCase();

    if (!trimmedName) return setError("A course needs a name.");
    if (trimmedName.length > 150) return setError("The name column holds 150 characters.");
    if (!trimmedCode) return setError("A course needs a code.");
    if (trimmedCode.length > 30) return setError("The code column holds 30 characters.");
    if (!departmentId) return setError("Pick the department this course belongs to.");

    const input = {
      name: trimmedName,
      code: trimmedCode,
      department_id: Number(departmentId),
      duration_years: durationYears,
    };
    const mutation = course ? updateCourse.mutateAsync({ id: course.id, input }) : createCourse.mutateAsync(input);

    mutation
      .then(() => {
        show(course ? "Course updated" : "Course added", "success");
        onClose();
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      });
  }

  return (
    <Modal open={open} onClose={onClose} title={course ? "Edit course" : "Add a course"} subtitle="The degree a student is admitted into." className="max-w-md">
      <div className="mb-3.5">
        <label className="mb-1 block text-[12.5px] font-semibold text-body">Name *</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="B.E. Computer Science and Engineering" maxLength={150} />
      </div>
      <div className="mb-3.5">
        <label className="mb-1 block text-[12.5px] font-semibold text-body">Code *</label>
        <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="CSE-BE" maxLength={30} />
      </div>
      <div className="mb-3.5">
        <label className="mb-1 block text-[12.5px] font-semibold text-body">Department *</label>
        <Select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
          <option value="">Select a department</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="mb-3.5">
        <label className="mb-1 block text-[12.5px] font-semibold text-body">Duration</label>
        <Select value={durationYears} onChange={(e) => setDurationYears(Number(e.target.value))}>
          {[1, 2, 3, 4, 5, 6].map((y) => (
            <option key={y} value={y}>
              {y} {y === 1 ? "year" : "years"}
            </option>
          ))}
        </Select>
        <p className="mt-1 text-[11px] text-subtle">Sets how many semesters a class of this course can be in.</p>
      </div>
      {error && <p className="mt-1 text-[11.5px] text-danger-fg">{error}</p>}
      <div className="mt-4.5 flex justify-end gap-2.5 border-t border-border-default pt-3.5">
        <Button variant="secondary" className="w-auto px-4 py-2.5" onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        <Button variant="primarySmall" onClick={handleSave} disabled={pending}>
          {pending ? "Saving…" : course ? "Save changes" : "Add course"}
        </Button>
      </div>
    </Modal>
  );
}
