"use client";

import { useState } from "react";
import { Button, Input, Modal } from "@/modules/admin/components/ui";
import { ApiError } from "@/types/api";
import { friendlyError } from "@/lib/utils/errors";
import { useCreateVendor, useUpdateVendor, type Vendor } from "@/modules/admin/api/vendors";

export function VendorDialog({
  open,
  onClose,
  vendor,
}: {
  open: boolean;
  onClose: () => void;
  /** Omit to create a new vendor; pass one to edit it. */
  vendor?: Vendor;
}) {
  const [name, setName] = useState(vendor?.name ?? "");
  const [contactInfo, setContactInfo] = useState(vendor?.contact_info ?? "");
  const [gstNo, setGstNo] = useState(vendor?.gst_no ?? "");
  const [error, setError] = useState<string | null>(null);
  const createVendor = useCreateVendor();
  const updateVendor = useUpdateVendor();

  const pending = createVendor.isPending || updateVendor.isPending;

  function handleSave() {
    setError(null);
    const trimmedName = name.trim();
    if (!trimmedName) return setError("Vendor name is required.");

    const input = {
      name: trimmedName,
      contact_info: contactInfo.trim() || undefined,
      gst_no: gstNo.trim() || undefined,
    };
    const mutation = vendor
      ? updateVendor.mutateAsync({ id: vendor.id, input })
      : createVendor.mutateAsync(input);

    mutation.then(onClose).catch((err: unknown) => {
      setError(err instanceof ApiError ? err.message : friendlyError(err));
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={vendor ? "Edit vendor" : "Add vendor"} widthClassName="max-w-lg">
      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-[12.5px] font-semibold text-admin-body">Name *</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Supplies Pvt Ltd" />
        </div>
        <div>
          <label className="mb-1 block text-[12.5px] font-semibold text-admin-body">Contact info</label>
          <Input
            value={contactInfo}
            onChange={(e) => setContactInfo(e.target.value)}
            placeholder="Phone / email / address"
          />
        </div>
        <div>
          <label className="mb-1 block text-[12.5px] font-semibold text-admin-body">GST number</label>
          <Input value={gstNo} onChange={(e) => setGstNo(e.target.value)} placeholder="Optional" />
        </div>
        {error && <p className="text-[11.5px] text-admin-danger">{error}</p>}
        <div className="flex justify-end gap-2.5 border-t border-admin-divider pt-4">
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={pending}>
            {pending ? "Saving…" : vendor ? "Save changes" : "Create vendor"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
