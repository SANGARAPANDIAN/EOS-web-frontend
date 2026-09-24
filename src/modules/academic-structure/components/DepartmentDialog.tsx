"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/modules/admin/components/ui/ToastProvider";
import { ApiError } from "@/types/api";
import { useCreateDepartment, useUpdateDepartment } from "../hooks/useAcademicStructureMutations";
import type { Department } from "../types";

interface DepartmentDialogProps {
  open: boolean;
  onClose: () => void;
  /** Omit to create a new department; pass one to edit it. */
  department?: Department;
}

export function DepartmentDialog({ open, onClose, department }: DepartmentDialogProps) {
  const [name, setName] = useState(department?.name ?? "");
  const [code, setCode] = useState(department?.code ?? "");
  const [error, setError] = useState<string | null>(null);
  const createDepartment = useCreateDepartment();
  const updateDepartment = useUpdateDepartment();
  const { show } = useToast();

  const pending = createDepartment.isPending || updateDepartment.isPending;

  function handleSave() {
    setError(null);
    const trimmedName = name.trim();
    const trimmedCode = code.trim().toUpperCase();
    if (!trimmedName) return setError("Department name is required.");
    if (!trimmedCode) return setError("Department code is required.");
    if (trimmedCode.length > 10) return setError("Code must be 10 characters or fewer.");

    const input = { name: trimmedName, code: trimmedCode };
    const mutation = department
      ? updateDepartment.mutateAsync({ id: department.id, input })
      : createDepartment.mutateAsync(input);

    mutation
      .then(() => {
        show(department ? "Department updated" : "Department created", "success");
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
      title={department ? "Edit department" : "Add department"}
      subtitle={department ? department.code : "e.g. Civil Engineering — courses and classes are created under this department."}
      className="max-w-lg"
    >
      <div className="mb-3.5">
        <label className="mb-1 block text-[12.5px] font-semibold text-body">Name *</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Civil Engineering" maxLength={150} />
      </div>
      <div className="mb-3.5">
        <label className="mb-1 block text-[12.5px] font-semibold text-body">Code *</label>
        <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="CIVIL" maxLength={10} />
      </div>
      {error && <p className="mt-1 text-[11.5px] text-danger-fg">{error}</p>}

      <div className="mt-4.5 flex justify-end gap-2.5 border-t border-border-default pt-3.5">
        <Button variant="secondary" className="w-auto px-4 py-2.5" onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        <Button variant="primarySmall" onClick={handleSave} disabled={pending}>
          {pending ? "Saving…" : department ? "Save changes" : "Create department"}
        </Button>
      </div>
    </Modal>
  );
}
