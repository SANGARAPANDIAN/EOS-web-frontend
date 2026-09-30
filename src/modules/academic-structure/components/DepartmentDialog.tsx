"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/modules/admin/components/ui/ToastProvider";
import { ApiError } from "@/types/api";
import { useCreateDepartment, useUpdateDepartment } from "../hooks/useAcademicStructureMutations";
import { submitApprovalRequest } from "@/modules/shared/api/approvalRequests";
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
  const [submittingForReview, setSubmittingForReview] = useState(false);
  const createDepartment = useCreateDepartment();
  const updateDepartment = useUpdateDepartment();
  const { show } = useToast();

  const pending = createDepartment.isPending || updateDepartment.isPending || submittingForReview;

  function validate(): { name: string; code: string } | null {
    setError(null);
    const trimmedName = name.trim();
    const trimmedCode = code.trim().toUpperCase();
    if (!trimmedName) {
      setError("Department name is required.");
      return null;
    }
    if (!trimmedCode) {
      setError("Department code is required.");
      return null;
    }
    if (trimmedCode.length > 10) {
      setError("Code must be 10 characters or fewer.");
      return null;
    }
    return { name: trimmedName, code: trimmedCode };
  }

  function handleSave() {
    const input = validate();
    if (!input) return;

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

  function handleSubmitForReview() {
    const input = validate();
    if (!input) return;

    setSubmittingForReview(true);
    submitApprovalRequest
      .department(input)
      .then(() => {
        show("Submitted for the Principal's review", "success");
        onClose();
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      })
      .finally(() => setSubmittingForReview(false));
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

      <div className="mt-4.5 flex items-center justify-end gap-2.5 border-t border-border-default pt-3.5">
        {!department && (
          <button
            type="button"
            onClick={handleSubmitForReview}
            disabled={pending}
            className="mr-auto text-[12.5px] font-semibold text-body underline decoration-dotted disabled:opacity-50"
          >
            {submittingForReview ? "Submitting…" : "Submit for review instead"}
          </button>
        )}
        <Button variant="secondary" className="w-auto px-4 py-2.5" onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        <Button variant="primarySmall" onClick={handleSave} disabled={pending}>
          {createDepartment.isPending || updateDepartment.isPending ? "Saving…" : department ? "Save changes" : "Create department"}
        </Button>
      </div>
    </Modal>
  );
}
