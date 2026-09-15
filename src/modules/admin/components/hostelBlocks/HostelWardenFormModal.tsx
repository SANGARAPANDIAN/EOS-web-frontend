"use client";

import { useState } from "react";
import { Modal, Button, FormField, Input, Select, useToast } from "@/modules/admin/components/ui";
import { friendlyError } from "@/lib/utils/errors";
import { useCreateHostelWarden, useUpdateHostelWarden, type AdminHostelWarden, type HostelWardenRole } from "@/modules/admin/api/hostelWardens";

interface HostelWardenFormModalProps {
  onClose: () => void;
  blockId: number;
  /** Editing an existing warden when set; adding a new one when omitted. Mounted only while open. */
  warden?: AdminHostelWarden;
}

export function HostelWardenFormModal({ onClose, blockId, warden }: HostelWardenFormModalProps) {
  const { show } = useToast();
  const createWarden = useCreateHostelWarden();
  const updateWarden = useUpdateHostelWarden();
  const isEditing = warden != null;

  const [name, setName] = useState(warden?.name ?? "");
  const [empId, setEmpId] = useState(warden?.emp_id ?? "");
  const [role, setRole] = useState<HostelWardenRole>(warden?.role ?? "sub_warden");
  const [designation, setDesignation] = useState(warden?.designation ?? "");
  const [mobile, setMobile] = useState(warden?.mobile ?? "");
  const [email, setEmail] = useState(warden?.email ?? "");
  const [error, setError] = useState<string | null>(null);

  const isPending = createWarden.isPending || updateWarden.isPending;

  function handleClose() {
    if (isPending) return;
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !empId.trim()) {
      setError("Name and employee ID are both required.");
      return;
    }
    setError(null);
    try {
      if (isEditing) {
        await updateWarden.mutateAsync({
          id: warden.id,
          input: {
            name: name.trim(),
            emp_id: empId.trim(),
            role,
            designation: designation.trim() || undefined,
            mobile: mobile.trim() || undefined,
            email: email.trim() || undefined,
          },
        });
        show("Warden updated.", "success");
        onClose();
        return;
      }
      await createWarden.mutateAsync({
        block_id: blockId,
        name: name.trim(),
        emp_id: empId.trim(),
        role,
        designation: designation.trim() || undefined,
        mobile: mobile.trim() || undefined,
        email: email.trim() || undefined,
      });
      show("Warden assigned.", "success");
      onClose();
    } catch (err) {
      setError(friendlyError(err));
    }
  }

  return (
    <Modal open onClose={handleClose} title={isEditing ? "Edit warden" : "Assign a warden"} widthClassName="max-w-lg">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label="Name">
          <Input placeholder="e.g. S. Palanivel" value={name} onChange={(e) => setName(e.target.value)} />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Employee ID">
            <Input placeholder="e.g. EMP-1042" value={empId} onChange={(e) => setEmpId(e.target.value)} />
          </FormField>
          <FormField label="Role">
            <Select value={role} onChange={(e) => setRole(e.target.value as HostelWardenRole)}>
              <option value="super_warden">Super warden</option>
              <option value="sub_warden">Sub warden</option>
            </Select>
          </FormField>
        </div>
        <FormField label="Designation (optional)">
          <Input placeholder="e.g. Assistant Professor" value={designation} onChange={(e) => setDesignation(e.target.value)} />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Mobile (optional)">
            <Input placeholder="e.g. 9876543210" value={mobile} onChange={(e) => setMobile(e.target.value)} />
          </FormField>
          <FormField label="Email (optional)">
            <Input type="email" placeholder="e.g. warden@sece.ac.in" value={email} onChange={(e) => setEmail(e.target.value)} />
          </FormField>
        </div>

        {error && <div className="rounded-admin-sm bg-admin-danger-bg px-3.5 py-2.5 text-[13px] font-semibold text-admin-danger">{error}</div>}

        <div className="mt-2 flex justify-end gap-2 border-t border-admin-divider pt-4">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isPending}>
            {isPending ? (isEditing ? "Saving…" : "Assigning…") : isEditing ? "Save changes" : "Assign warden"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
