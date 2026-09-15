"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, IconButton, PageHeader, Select, ConfirmDialog, useToast } from "@/modules/admin/components/ui";
import { Icon } from "@/components/ui/Icon";
import { friendlyError } from "@/lib/utils/errors";
import { useAdminHostelBlocks, useDeleteHostelBlock, type AdminHostelBlock } from "@/modules/admin/api/hostelBlocks";
import { useHostelOptions } from "@/modules/admin/api/reports";
import { HostelBlockFormModal } from "@/modules/admin/components/hostelBlocks/HostelBlockFormModal";

function BlockRow({ block, onOpen, onDelete }: { block: AdminHostelBlock; onOpen: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-admin-divider px-5 py-4 last:border-b-0">
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <div className="text-[14px] font-bold text-admin-ink hover:underline">
          {block.hostel.name} · {block.name}
        </div>
        <div className="mt-0.5 text-sm text-admin-muted">
          {block.floors} floor{block.floors === 1 ? "" : "s"} · {block.rooms_count} room{block.rooms_count === 1 ? "" : "s"} · {block.occupied}/{block.capacity} occupied
          {block.warden && ` · ${block.warden.name} (${block.warden.role === "super_warden" ? "Super warden" : "Sub warden"})`}
        </div>
      </button>
      <IconButton icon="chevron_right" size={34} iconSize={18} onClick={onOpen} aria-label={`Manage ${block.name}`} />
      <IconButton icon="delete" size={34} iconSize={17} onClick={onDelete} aria-label={`Delete ${block.name}`} />
    </div>
  );
}

export default function AdminHostelBlocksPage() {
  const router = useRouter();
  const { show } = useToast();
  const hostels = useHostelOptions();
  const [hostelFilter, setHostelFilter] = useState<string>("all");
  const hostelId = hostelFilter === "all" ? null : Number(hostelFilter);
  const blocks = useAdminHostelBlocks(hostelId);
  const deleteBlock = useDeleteHostelBlock();

  const [createOpen, setCreateOpen] = useState(false);
  const [deletingBlock, setDeletingBlock] = useState<AdminHostelBlock | null>(null);

  async function confirmDelete() {
    if (!deletingBlock) return;
    try {
      await deleteBlock.mutateAsync(deletingBlock.id);
      show("Block deleted.", "success");
      setDeletingBlock(null);
    } catch (err) {
      show(friendlyError(err), "error");
    }
  }

  return (
    <div>
      <PageHeader
        title="Hostel blocks"
        description="Structural master data for every hostel — Warden, Student and Principal views all read the same blocks from here. Open a block to manage its wardens and rooms in detail."
        actions={
          <Button variant="primary" onClick={() => setCreateOpen(true)} disabled={(hostels.data?.length ?? 0) === 0}>
            <Icon name="add" size={16} /> Create block
          </Button>
        }
      />

      <div className="mt-5 max-w-xs">
        <Select value={hostelFilter} onChange={(e) => setHostelFilter(e.target.value)}>
          <option value="all">All hostels</option>
          {hostels.data?.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name} ({h.code})
            </option>
          ))}
        </Select>
      </div>

      <Card hoverable={false} className="mt-5 overflow-hidden">
        {blocks.isLoading && <p className="p-5 text-center text-sm text-admin-subtle">Loading blocks…</p>}
        {blocks.error && <p className="p-5 text-center text-sm text-admin-danger">{friendlyError(blocks.error)}</p>}
        {!blocks.isLoading && !blocks.error && blocks.data?.length === 0 && (
          <p className="p-5 text-center text-sm text-admin-subtle">
            {(hostels.data?.length ?? 0) === 0 ? "No hostels on file yet — create a hostel first." : "No blocks yet — create the first one above."}
          </p>
        )}
        {blocks.data?.map((b) => (
          <BlockRow
            key={b.id}
            block={b}
            onOpen={() => router.push(`/admin/facilities/hostel-blocks/${b.id}`)}
            onDelete={() => setDeletingBlock(b)}
          />
        ))}
      </Card>

      {createOpen && (
        <HostelBlockFormModal onClose={() => setCreateOpen(false)} hostels={hostels.data ?? []} defaultHostelId={hostelId} />
      )}

      <ConfirmDialog
        open={deletingBlock != null}
        onClose={() => setDeletingBlock(null)}
        onConfirm={confirmDelete}
        title="Delete this block?"
        message={
          deletingBlock
            ? `${deletingBlock.name} will be permanently removed. This is blocked while any room is still assigned to it.`
            : ""
        }
        confirmLabel="Delete"
        destructive
        isConfirming={deleteBlock.isPending}
      />
    </div>
  );
}
