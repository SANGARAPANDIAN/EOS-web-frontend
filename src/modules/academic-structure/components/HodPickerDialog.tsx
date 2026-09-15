"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/modules/admin/components/ui/ToastProvider";
import { ApiError } from "@/types/api";
import { useFacultyInDepartment } from "../hooks/useAcademicStructureQueries";
import { useAssignHod } from "../hooks/useAcademicStructureMutations";
import type { Department } from "../types";

interface HodPickerDialogProps {
  open: boolean;
  onClose: () => void;
  department: Department;
}

export function HodPickerDialog({ open, onClose, department }: HodPickerDialogProps) {
  const [facultyId, setFacultyId] = useState<string>(
    department.head_of_department_faculty_id != null ? String(department.head_of_department_faculty_id) : "",
  );
  const { data: faculty, isLoading } = useFacultyInDepartment(department.id);
  const assignHod = useAssignHod();
  const { show } = useToast();

  function handleSave() {
    assignHod
      .mutateAsync({ id: department.id, input: { faculty_id: facultyId ? Number(facultyId) : null } })
      .then(() => {
        show(facultyId ? "Head of Department assigned" : "Head of Department cleared", "success");
        onClose();
      })
      .catch((err: unknown) => {
        show(err instanceof ApiError ? err.message : "Something went wrong. Please try again.", "error");
      });
  }

  return (
    <Modal open={open} onClose={onClose} title="Head of Department" subtitle={`For ${department.name}`} className="max-w-md">
      <div className="mb-3.5">
        <label className="mb-1 block text-[12.5px] font-semibold text-body">Faculty</label>
        <Select value={facultyId} onChange={(e) => setFacultyId(e.target.value)} disabled={isLoading}>
          <option value="">No Head of Department</option>
          {faculty?.data.map((f) => (
            <option key={f.id} value={f.id}>
              {[f.prefix, f.first_name, f.last_name].filter(Boolean).join(" ")}
              {f.designation ? ` — ${f.designation}` : ""}
            </option>
          ))}
        </Select>
        <p className="mt-1 text-[11px] text-subtle">
          {isLoading ? "Loading faculty…" : "Only faculty already in this department can be assigned."}
        </p>
      </div>
      <div className="mt-4.5 flex justify-end gap-2.5 border-t border-border-default pt-3.5">
        <Button variant="secondary" className="w-auto px-4 py-2.5" onClick={onClose} disabled={assignHod.isPending}>
          Cancel
        </Button>
        <Button variant="primarySmall" onClick={handleSave} disabled={assignHod.isPending}>
          {assignHod.isPending ? "Saving…" : "Save"}
        </Button>
      </div>
    </Modal>
  );
}
