"use client";

import { useState } from "react";
import { Modal, Button, FormField, Input, Select, useToast } from "@/modules/admin/components/ui";
import { friendlyError } from "@/lib/utils/errors";
import { useCreateHostelRoom, useUpdateHostelRoom, useHostelRoomTypes, type AdminHostelRoom } from "@/modules/admin/api/hostelRooms";
import { useAdminHostelFloors } from "@/modules/admin/api/hostelFloors";

interface HostelRoomFormModalProps {
  onClose: () => void;
  hostelId: number;
  blockId: number;
  /** Editing an existing room when set; creating a new one when omitted. Mounted only while open. */
  room?: AdminHostelRoom;
}

export function HostelRoomFormModal({ onClose, hostelId, blockId, room }: HostelRoomFormModalProps) {
  const { show } = useToast();
  const roomTypes = useHostelRoomTypes();
  const floors = useAdminHostelFloors(blockId);
  const createRoom = useCreateHostelRoom();
  const updateRoom = useUpdateHostelRoom();
  const isEditing = room != null;

  const [roomNumber, setRoomNumber] = useState(room?.room_number ?? "");
  const [roomTypeId, setRoomTypeId] = useState(room?.room_type_id != null ? String(room.room_type_id) : "");
  const [capacity, setCapacity] = useState(room?.capacity != null ? String(room.capacity) : "");
  const [floorId, setFloorId] = useState(room?.floor?.id != null ? String(room.floor.id) : "");
  const [error, setError] = useState<string | null>(null);

  const isPending = createRoom.isPending || updateRoom.isPending;

  function handleClose() {
    if (isPending) return;
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!roomNumber.trim() || !roomTypeId || !capacity.trim()) {
      setError("Room number, room type and capacity are all required.");
      return;
    }
    setError(null);
    try {
      if (isEditing) {
        await updateRoom.mutateAsync({
          id: room.id,
          input: {
            room_number: roomNumber.trim(),
            room_type_id: Number(roomTypeId),
            capacity: Number(capacity),
            floor_id: floorId ? Number(floorId) : null,
          },
        });
        show("Room updated.", "success");
        onClose();
        return;
      }
      await createRoom.mutateAsync({
        hostel_id: hostelId,
        block_id: blockId,
        room_number: roomNumber.trim(),
        room_type_id: Number(roomTypeId),
        capacity: Number(capacity),
        floor_id: floorId ? Number(floorId) : null,
      });
      show("Room created.", "success");
      onClose();
    } catch (err) {
      setError(friendlyError(err));
    }
  }

  return (
    <Modal open onClose={handleClose} title={isEditing ? "Edit room" : "Add room to this block"} widthClassName="max-w-lg">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label="Room number">
          <Input placeholder="e.g. A-101" value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Room type">
            <Select value={roomTypeId} onChange={(e) => setRoomTypeId(e.target.value)}>
              <option value="">Select type</option>
              {roomTypes.data?.map((rt) => (
                <option key={rt.id} value={rt.id}>
                  {rt.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Capacity">
            <Input type="number" min={1} placeholder="e.g. 4" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
          </FormField>
        </div>
        <FormField label="Floor (optional)">
          <Select value={floorId} onChange={(e) => setFloorId(e.target.value)}>
            <option value="">No floor set</option>
            {floors.data?.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </Select>
        </FormField>

        {error &&<div className="rounded-admin-sm bg-admin-danger-bg px-3.5 py-2.5 text-[13px] font-semibold text-admin-danger">{error}</div>}

        <div className="mt-2 flex justify-end gap-2 border-t border-admin-divider pt-4">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isPending}>
            {isPending ? (isEditing ? "Saving…" : "Creating…") : isEditing ? "Save changes" : "Add room"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
