"use client";

import { useState } from "react";
import { Modal, Button, FormField, Input, useToast } from "@/modules/admin/components/ui";
import { friendlyError } from "@/lib/utils/errors";
import { useCreateHostelFloor, useUpdateHostelFloor, type AdminHostelFloor } from "@/modules/admin/api/hostelFloors";

interface HostelFloorFormModalProps {
  onClose: () => void;
  blockId: number;
  /** Editing an existing floor when set; creating a new one when omitted. Mounted only while open. */
  floor?: AdminHostelFloor;
}

export function HostelFloorFormModal({ onClose, blockId, floor }: HostelFloorFormModalProps) {
  const { show } = useToast();
  const createFloor = useCreateHostelFloor();
  const updateFloor = useUpdateHostelFloor();
  const isEditing = floor != null;

  const [name, setName] = useState(floor?.name ?? "");
  const [error, setError] = useState<string | null>(null);

  const isPending = createFloor.isPending || updateFloor.isPending;

  function handleClose() {
    if (isPending) return;
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Floor name is required.");
      return;
    }
    setError(null);
    try {
      if (isEditing) {
        await updateFloor.mutateAsync({ id: floor.id, input: { name: name.trim() } });
        show("Floor updated.", "success");
        onClose();
        return;
      }
      await createFloor.mutateAsync({ block_id: blockId, name: name.trim() });
      show("Floor created.", "success");
      onClose();
    } catch (err) {
      setError(friendlyError(err));
    }
  }

  return (
    <Modal open onClose={handleClose} title={isEditing ? "Edit floor" : "Add a floor"} widthClassName="max-w-md">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label="Floor name">
          <Input placeholder="e.g. Ground Floor, 1st Floor" value={name} onChange={(e) => setName(e.target.value)} />
        </FormField>

        {error && <div className="rounded-admin-sm bg-admin-danger-bg px-3.5 py-2.5 text-[13px] font-semibold text-admin-danger">{error}</div>}

        <div className="mt-2 flex justify-end gap-2 border-t border-admin-divider pt-4">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isPending}>
            {isPending ? (isEditing ? "Saving…" : "Creating…") : isEditing ? "Save changes" : "Add floor"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
