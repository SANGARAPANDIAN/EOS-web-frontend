"use client";

import { useState } from "react";
import { Button, Card, IconButton, PageHeader, PhotoPicker, useToast } from "@/modules/admin/components/ui";
import { Icon } from "@/components/ui/Icon";
import { avatarToneFor } from "@/modules/admin/lib/faculty-format";
import { friendlyError } from "@/lib/utils/errors";
import { useAdminVenues, useDeleteVenuePhoto, useUploadVenuePhoto, type AdminVenue } from "@/modules/admin/api/venues";
import { VenueFormModal } from "@/modules/admin/components/venues/VenueFormModal";

function venueInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  return ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase() || "V";
}

function VenueRow({ venue, onEdit }: { venue: AdminVenue; onEdit: () => void }) {
  const { show } = useToast();
  const uploadPhoto = useUploadVenuePhoto();
  const deletePhoto = useDeleteVenuePhoto();

  async function handlePick(file: File) {
    try {
      await uploadPhoto.mutateAsync({ id: venue.id, file });
      show("Photo updated.", "success");
    } catch (err) {
      show(friendlyError(err), "error");
    }
  }

  async function handleRemove() {
    try {
      await deletePhoto.mutateAsync(venue.id);
      show("Photo removed.", "success");
    } catch (err) {
      show(friendlyError(err), "error");
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 border-b border-admin-divider px-5 py-4 last:border-b-0">
      <PhotoPicker
        photoDataUrl={venue.photo_url}
        initials={venueInitials(venue.name)}
        tone={avatarToneFor(venue.id)}
        isUploading={uploadPhoto.isPending}
        onPick={handlePick}
        onRemove={venue.photo_url ? handleRemove : undefined}
      />
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-bold text-admin-ink">{venue.name}</div>
        <div className="mt-0.5 text-sm text-admin-muted">
          {venue.location ?? "No location on file"} · {venue.capacity != null ? `${venue.capacity} seats` : "Capacity unknown"}
        </div>
      </div>
      <IconButton icon="edit" size={34} iconSize={17} onClick={onEdit} aria-label={`Edit ${venue.name}`} />
    </div>
  );
}

export default function AdminVenuesPage() {
  const { data: venues, isLoading, error } = useAdminVenues();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingVenue, setEditingVenue] = useState<AdminVenue | null>(null);

  return (
    <div>
      <PageHeader
        title="Venues"
        description="Add a photo to any venue so it shows up recognizably wherever it's booked — Secretary, HoD and Faculty all see the same photo."
        actions={
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            <Icon name="add" size={16} /> Create venue
          </Button>
        }
      />

      <Card hoverable={false} className="mt-5 overflow-hidden">
        {isLoading && <p className="p-5 text-center text-sm text-admin-subtle">Loading venues…</p>}
        {error && <p className="p-5 text-center text-sm text-admin-danger">{friendlyError(error)}</p>}
        {!isLoading && !error && venues?.length === 0 && (
          <p className="p-5 text-center text-sm text-admin-subtle">No venues yet — create the first one above.</p>
        )}
        {venues?.map((v) => (
          <VenueRow key={v.id} venue={v} onEdit={() => setEditingVenue(v)} />
        ))}
      </Card>

      {createOpen && <VenueFormModal onClose={() => setCreateOpen(false)} />}
      {editingVenue && <VenueFormModal key={editingVenue.id} onClose={() => setEditingVenue(null)} venue={editingVenue} />}
    </div>
  );
}
