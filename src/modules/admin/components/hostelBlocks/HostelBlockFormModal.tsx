"use client";

import { useState } from "react";
import { Modal, Button, FormField, Input, Select, useToast } from "@/modules/admin/components/ui";
import { friendlyError } from "@/lib/utils/errors";
import { useCreateHostelBlock, useUpdateHostelBlock, type AdminHostelBlock } from "@/modules/admin/api/hostelBlocks";
import type { HostelOption } from "@/modules/admin/api/reports";

interface HostelBlockFormModalProps {
  onClose: () => void;
  hostels: HostelOption[];
  /** Editing an existing block when set; creating a new one when omitted. Mounted only while open, so props only need to seed initial state. */
  block?: AdminHostelBlock;
  /** Preselects a hostel on create (e.g. when opened from an already-filtered list). */
  defaultHostelId?: number | null;
}

export function HostelBlockFormModal({ onClose, hostels, block, defaultHostelId }: HostelBlockFormModalProps) {
  const { show } = useToast();
  const createBlock = useCreateHostelBlock();
  const updateBlock = useUpdateHostelBlock();
  const isEditing = block != null;

  const [hostelId, setHostelId] = useState(String(block?.hostel.id ?? defaultHostelId ?? hostels[0]?.id ?? ""));
  const [name, setName] = useState(block?.name ?? "");
  const [floors, setFloors] = useState(block?.floors != null ? String(block.floors) : "1");
  const [error, setError] = useState<string | null>(null);

  const isPending = createBlock.isPending || updateBlock.isPending;

  function handleClose() {
    if (isPending) return;
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !floors.trim()) {
      setError("Block name and number of floors are both required.");
      return;
    }
    if (!isEditing && !hostelId) {
      setError("Pick a hostel.");
      return;
    }
    setError(null);
    try {
      if (isEditing) {
        await updateBlock.mutateAsync({ id: block.id, input: { name: name.trim(), floors: Number(floors) } });
        show("Block updated.", "success");
        onClose();
        return;
      }
      await createBlock.mutateAsync({ hostel_id: Number(hostelId), name: name.trim(), floors: Number(floors) });
      show("Block created.", "success");
      onClose();
    } catch (err) {
      setError(friendlyError(err));
    }
  }

  return (
    <Modal
      open
      onClose={handleClose}
      title={isEditing ? "Edit hostel block" : "Create hostel block"}
      subtitle={isEditing ? "Changes reflect everywhere this block is shown — Warden, Student and Principal views." : "Adds a new structural block under a hostel."}
      widthClassName="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label="Hostel">
          {isEditing ? (
            <div className="flex h-11 items-center rounded-admin-control border border-admin-border bg-admin-tint px-3 text-sm font-semibold text-admin-ink">
              {block.hostel.name} ({block.hostel.code})
            </div>
          ) : (
            <Select value={hostelId} onChange={(e) => setHostelId(e.target.value)}>
              {hostels.length === 0 && <option value="">No hostels on file</option>}
              {hostels.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.code})
                </option>
              ))}
            </Select>
          )}
        </FormField>
        <FormField label="Block name">
          <Input placeholder="e.g. Block A" value={name} onChange={(e) => setName(e.target.value)} />
        </FormField>
        <FormField label="Number of floors">
          <Input type="number" min={1} max={50} value={floors} onChange={(e) => setFloors(e.target.value)} />
        </FormField>

        {error && <div className="rounded-admin-sm bg-admin-danger-bg px-3.5 py-2.5 text-[13px] font-semibold text-admin-danger">{error}</div>}

        <div className="mt-2 flex justify-end gap-2 border-t border-admin-divider pt-4">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isPending}>
            {isPending ? (isEditing ? "Saving…" : "Creating…") : isEditing ? "Save changes" : "Create block"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
