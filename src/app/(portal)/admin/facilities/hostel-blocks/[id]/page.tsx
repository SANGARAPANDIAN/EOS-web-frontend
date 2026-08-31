"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Card, IconButton, PageHeader, SectionCard, ConfirmDialog, useToast, EmptyState } from "@/modules/admin/components/ui";
import { Icon } from "@/components/ui/Icon";
import { friendlyError } from "@/lib/utils/errors";
import { useAdminHostelBlock, useDeleteHostelBlock, type AdminHostelBlock } from "@/modules/admin/api/hostelBlocks";
import { useAdminHostelWardens, useDeleteHostelWarden, type AdminHostelWarden } from "@/modules/admin/api/hostelWardens";
import { useAdminHostelRooms, useDeleteHostelRoom, useHostelRoomTypes, type AdminHostelRoom } from "@/modules/admin/api/hostelRooms";
import { useAdminHostelFloors, useDeleteHostelFloor, type AdminHostelFloor } from "@/modules/admin/api/hostelFloors";
import { HostelBlockFormModal } from "@/modules/admin/components/hostelBlocks/HostelBlockFormModal";
import { HostelWardenFormModal } from "@/modules/admin/components/hostelBlocks/HostelWardenFormModal";
import { HostelRoomFormModal } from "@/modules/admin/components/hostelBlocks/HostelRoomFormModal";
import { HostelFloorFormModal } from "@/modules/admin/components/hostelBlocks/HostelFloorFormModal";

const ROLE_LABEL: Record<string, string> = { super_warden: "Super warden", sub_warden: "Sub warden" };

function WardenRow({ warden, onEdit, onDelete }: { warden: AdminHostelWarden; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-admin-divider px-5 py-3.5 last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-bold text-admin-ink">
          {warden.name} <span className="font-normal text-admin-muted">· {ROLE_LABEL[warden.role]}</span>
        </div>
        <div className="mt-0.5 text-sm text-admin-muted">
          {warden.emp_id}
          {warden.designation && ` · ${warden.designation}`}
          {warden.mobile && ` · ${warden.mobile}`}
        </div>
      </div>
      <IconButton icon="edit" size={32} iconSize={16} onClick={onEdit} aria-label={`Edit ${warden.name}`} />
      <IconButton icon="delete" size={32} iconSize={16} onClick={onDelete} aria-label={`Remove ${warden.name}`} />
    </div>
  );
}

function RoomRow({ room, roomTypeName, onEdit, onDelete }: { room: AdminHostelRoom; roomTypeName: string; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-admin-divider px-5 py-3.5 last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-bold text-admin-ink">
          {room.room_number}
          {room.floor && <span className="font-normal text-admin-muted"> · {room.floor.name}</span>}
        </div>
        <div className="mt-0.5 text-sm text-admin-muted">
          {roomTypeName} · {room.occupied}/{room.capacity} occupied
        </div>
      </div>
      <IconButton icon="edit" size={32} iconSize={16} onClick={onEdit} aria-label={`Edit room ${room.room_number}`} />
      <IconButton icon="delete" size={32} iconSize={16} onClick={onDelete} aria-label={`Delete room ${room.room_number}`} />
    </div>
  );
}

function FloorRow({ floor, onEdit, onDelete }: { floor: AdminHostelFloor; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-admin-divider px-5 py-3.5 last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-bold text-admin-ink">{floor.name}</div>
        <div className="mt-0.5 text-sm text-admin-muted">
          {floor.rooms_count} room{floor.rooms_count === 1 ? "" : "s"} · {floor.occupied}/{floor.capacity} occupied
        </div>
      </div>
      <IconButton icon="edit" size={32} iconSize={16} onClick={onEdit} aria-label={`Edit ${floor.name}`} />
      <IconButton icon="delete" size={32} iconSize={16} onClick={onDelete} aria-label={`Delete ${floor.name}`} />
    </div>
  );
}

export default function AdminHostelBlockDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { show } = useToast();
  const blockId = Number(params.id);

  const block = useAdminHostelBlock(Number.isFinite(blockId) ? blockId : null);
  const wardens = useAdminHostelWardens(Number.isFinite(blockId) ? blockId : null);
  const rooms = useAdminHostelRooms({ blockId: Number.isFinite(blockId) ? blockId : null });
  const floors = useAdminHostelFloors(Number.isFinite(blockId) ? blockId : null);
  const roomTypes = useHostelRoomTypes();
  const deleteBlock = useDeleteHostelBlock();
  const deleteWarden = useDeleteHostelWarden();
  const deleteRoom = useDeleteHostelRoom();
  const deleteFloor = useDeleteHostelFloor();

  const [editingBlock, setEditingBlock] = useState(false);
  const [addingWarden, setAddingWarden] = useState(false);
  const [editingWarden, setEditingWarden] = useState<AdminHostelWarden | null>(null);
  const [deletingWarden, setDeletingWarden] = useState<AdminHostelWarden | null>(null);
  const [addingRoom, setAddingRoom] = useState(false);
  const [editingRoom, setEditingRoom] = useState<AdminHostelRoom | null>(null);
  const [deletingRoom, setDeletingRoom] = useState<AdminHostelRoom | null>(null);
  const [addingFloor, setAddingFloor] = useState(false);
  const [editingFloor, setEditingFloor] = useState<AdminHostelFloor | null>(null);
  const [deletingFloor, setDeletingFloor] = useState<AdminHostelFloor | null>(null);
  const [deletingBlockConfirm, setDeletingBlockConfirm] = useState(false);

  const roomTypeNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const rt of roomTypes.data ?? []) map.set(rt.id, rt.name);
    return map;
  }, [roomTypes.data]);

  async function confirmDeleteWarden() {
    if (!deletingWarden) return;
    try {
      await deleteWarden.mutateAsync(deletingWarden.id);
      show("Warden removed.", "success");
      setDeletingWarden(null);
    } catch (err) {
      show(friendlyError(err), "error");
    }
  }

  async function confirmDeleteRoom() {
    if (!deletingRoom) return;
    try {
      await deleteRoom.mutateAsync(deletingRoom.id);
      show("Room deleted.", "success");
      setDeletingRoom(null);
    } catch (err) {
      show(friendlyError(err), "error");
    }
  }

  async function confirmDeleteFloor() {
    if (!deletingFloor) return;
    try {
      await deleteFloor.mutateAsync(deletingFloor.id);
      show("Floor deleted.", "success");
      setDeletingFloor(null);
    } catch (err) {
      show(friendlyError(err), "error");
    }
  }

  async function confirmDeleteBlock() {
    if (!block.data) return;
    try {
      await deleteBlock.mutateAsync(block.data.id);
      show("Block deleted.", "success");
      router.push("/admin/facilities/hostel-blocks");
    } catch (err) {
      show(friendlyError(err), "error");
      setDeletingBlockConfirm(false);
    }
  }

  if (block.isLoading) {
    return (
      <Card hoverable={false} className="mt-5">
        <p className="p-5 text-center text-sm text-admin-subtle">Loading block…</p>
      </Card>
    );
  }
  if (block.error || !block.data) {
    return (
      <Card hoverable={false} className="mt-5">
        <p className="p-5 text-center text-sm text-admin-danger">{block.error ? friendlyError(block.error) : "Block not found."}</p>
      </Card>
    );
  }

  const b: AdminHostelBlock = block.data;

  return (
    <div>
      <button
        type="button"
        onClick={() => router.push("/admin/facilities/hostel-blocks")}
        className="mb-4 flex items-center gap-1.5 text-[13px] font-semibold text-admin-muted hover:text-admin-ink"
      >
        <Icon name="arrow_back" size={16} /> All blocks
      </button>

      <PageHeader
        title={`${b.hostel.name} · ${b.name}`}
        description={`${b.floors} floor${b.floors === 1 ? "" : "s"} · ${b.rooms_count} room${b.rooms_count === 1 ? "" : "s"} · ${b.occupied}/${b.capacity} occupied`}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setEditingBlock(true)}>
              <Icon name="edit" size={16} /> Edit block
            </Button>
            <Button variant="danger" onClick={() => setDeletingBlockConfirm(true)}>
              <Icon name="delete" size={16} /> Delete block
            </Button>
          </div>
        }
      />

      <div className="mt-6">
        <SectionCard
          title="Floors"
          bodyClassName="p-0"
          actions={
            <Button variant="secondary" onClick={() => setAddingFloor(true)}>
              <Icon name="add" size={16} /> Add floor
            </Button>
          }
        >
          {floors.isLoading && <p className="p-5 text-center text-sm text-admin-subtle">Loading floors…</p>}
          {!floors.isLoading && (floors.data?.length ?? 0) === 0 && (
            <div className="p-5">
              <EmptyState title="No floors yet" description="No floors have been added to this block." />
            </div>
          )}
          {floors.data?.map((f) => (
            <FloorRow key={f.id} floor={f} onEdit={() => setEditingFloor(f)} onDelete={() => setDeletingFloor(f)} />
          ))}
        </SectionCard>
      </div>

      <div className="mt-6">
        <SectionCard
          title="Wardens"
          bodyClassName="p-0"
          actions={
            <Button variant="secondary" onClick={() => setAddingWarden(true)}>
              <Icon name="add" size={16} /> Assign warden
            </Button>
          }
        >
          {wardens.isLoading && <p className="p-5 text-center text-sm text-admin-subtle">Loading wardens…</p>}
          {!wardens.isLoading && (wardens.data?.length ?? 0) === 0 && (
            <div className="p-5">
              <EmptyState title="No warden assigned" description="This block has no warden on file yet." />
            </div>
          )}
          {wardens.data?.map((w) => (
            <WardenRow key={w.id} warden={w} onEdit={() => setEditingWarden(w)} onDelete={() => setDeletingWarden(w)} />
          ))}
        </SectionCard>
      </div>

      <div className="mt-6">
        <SectionCard
          title="Rooms"
          bodyClassName="p-0"
          actions={
            <Button variant="secondary" onClick={() => setAddingRoom(true)}>
              <Icon name="add" size={16} /> Add room
            </Button>
          }
        >
          {rooms.isLoading && <p className="p-5 text-center text-sm text-admin-subtle">Loading rooms…</p>}
          {!rooms.isLoading && (rooms.data?.length ?? 0) === 0 && (
            <div className="p-5">
              <EmptyState title="No rooms yet" description="No rooms have been placed in this block." />
            </div>
          )}
          {rooms.data?.map((r) => (
            <RoomRow
              key={r.id}
              room={r}
              roomTypeName={roomTypeNameById.get(r.room_type_id) ?? "—"}
              onEdit={() => setEditingRoom(r)}
              onDelete={() => setDeletingRoom(r)}
            />
          ))}
        </SectionCard>
      </div>

      {editingBlock && <HostelBlockFormModal onClose={() => setEditingBlock(false)} hostels={[]} block={b} />}
      {addingWarden && <HostelWardenFormModal onClose={() => setAddingWarden(false)} blockId={b.id} />}
      {editingWarden && <HostelWardenFormModal key={editingWarden.id} onClose={() => setEditingWarden(null)} blockId={b.id} warden={editingWarden} />}
      {addingRoom && <HostelRoomFormModal onClose={() => setAddingRoom(false)} hostelId={b.hostel.id} blockId={b.id} />}
      {editingRoom && (
        <HostelRoomFormModal key={editingRoom.id} onClose={() => setEditingRoom(null)} hostelId={b.hostel.id} blockId={b.id} room={editingRoom} />
      )}
      {addingFloor && <HostelFloorFormModal onClose={() => setAddingFloor(false)} blockId={b.id} />}
      {editingFloor && <HostelFloorFormModal key={editingFloor.id} onClose={() => setEditingFloor(null)} blockId={b.id} floor={editingFloor} />}

      <ConfirmDialog
        open={deletingWarden != null}
        onClose={() => setDeletingWarden(null)}
        onConfirm={confirmDeleteWarden}
        title="Remove this warden?"
        message={deletingWarden ? `${deletingWarden.name} will no longer be listed as a warden of this block.` : ""}
        confirmLabel="Remove"
        destructive
        isConfirming={deleteWarden.isPending}
      />
      <ConfirmDialog
        open={deletingRoom != null}
        onClose={() => setDeletingRoom(null)}
        onConfirm={confirmDeleteRoom}
        title="Delete this room?"
        message={deletingRoom ? `Room ${deletingRoom.room_number} will be permanently removed. This is blocked while a student is still assigned to it.` : ""}
        confirmLabel="Delete"
        destructive
        isConfirming={deleteRoom.isPending}
      />
      <ConfirmDialog
        open={deletingFloor != null}
        onClose={() => setDeletingFloor(null)}
        onConfirm={confirmDeleteFloor}
        title="Delete this floor?"
        message={deletingFloor ? `${deletingFloor.name} will be permanently removed. This is blocked while a room is still assigned to it.` : ""}
        confirmLabel="Delete"
        destructive
        isConfirming={deleteFloor.isPending}
      />
      <ConfirmDialog
        open={deletingBlockConfirm}
        onClose={() => setDeletingBlockConfirm(false)}
        onConfirm={confirmDeleteBlock}
        title="Delete this block?"
        message={`${b.name} will be permanently removed. This is blocked while any room is still assigned to it.`}
        confirmLabel="Delete"
        destructive
        isConfirming={deleteBlock.isPending}
      />
    </div>
  );
}
