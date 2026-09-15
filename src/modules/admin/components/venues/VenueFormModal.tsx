"use client";

import { useRef, useState } from "react";
import { Modal, Button, FormField, Input, useToast } from "@/modules/admin/components/ui";
import { friendlyError } from "@/lib/utils/errors";
import { useCreateVenue, useUpdateVenue, useUploadVenuePhoto, type AdminVenue } from "@/modules/admin/api/venues";

interface VenueFormModalProps {
  onClose: () => void;
  /** Editing an existing venue when set; creating a new one when omitted. The
   * caller mounts this component only while open (`{editingVenue && <VenueFormModal .../>}`),
   * so these props only need to seed initial state — no effect needed to
   * resync them if they change, because they never do while mounted. */
  venue?: AdminVenue;
}

/**
 * Create: two real calls, one flow — POST /venues creates the row, then
 * (only if a photo was picked) POST /venues/:id/photo uploads it against the
 * id just returned. Edit: a single PATCH /venues/:id — photo changes stay on
 * the row's own PhotoPicker (already wired) rather than duplicating that
 * control here.
 */
export function VenueFormModal({ onClose, venue }: VenueFormModalProps) {
  const { show } = useToast();
  const createVenue = useCreateVenue();
  const updateVenue = useUpdateVenue();
  const uploadPhoto = useUploadVenuePhoto();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEditing = venue != null;

  const [name, setName] = useState(venue?.name ?? "");
  const [location, setLocation] = useState(venue?.location ?? "");
  const [capacity, setCapacity] = useState(venue?.capacity != null ? String(venue.capacity) : "");
  const [photo, setPhoto] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isPending = createVenue.isPending || updateVenue.isPending || uploadPhoto.isPending;

  function handleClose() {
    if (isPending) return;
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Venue name is required.");
      return;
    }
    setError(null);
    try {
      if (isEditing) {
        await updateVenue.mutateAsync({
          id: venue.id,
          name: name.trim(),
          location: location.trim() || undefined,
          capacity: capacity ? Number(capacity) : undefined,
        });
        show("Venue updated.", "success");
        onClose();
        return;
      }

      const created = await createVenue.mutateAsync({
        name: name.trim(),
        location: location.trim() || undefined,
        capacity: capacity ? Number(capacity) : undefined,
      });
      if (photo) {
        try {
          await uploadPhoto.mutateAsync({ id: created.id, file: photo });
        } catch (err) {
          // The venue itself was created successfully — only the photo attach failed, so surface that distinctly rather than implying the whole thing failed.
          show(`Venue created, but the photo didn't upload: ${friendlyError(err)}`, "error");
          onClose();
          return;
        }
      }
      show("Venue created.", "success");
      onClose();
    } catch (err) {
      setError(friendlyError(err));
    }
  }

  return (
    <Modal
      open
      onClose={handleClose}
      title={isEditing ? "Edit venue" : "Create venue"}
      subtitle={isEditing ? "Changes reflect everywhere this venue is shown or booked." : "Adds a new bookable venue for every module."}
      widthClassName="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label="Venue name">
          <Input placeholder="e.g. Innovation Hall" value={name} onChange={(e) => setName(e.target.value)} />
        </FormField>
        <FormField label="Location">
          <Input placeholder="e.g. Main Block, 2nd Floor" value={location} onChange={(e) => setLocation(e.target.value)} />
        </FormField>
        <FormField label="Capacity">
          <Input type="number" min={1} placeholder="e.g. 200" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
        </FormField>
        {!isEditing && (
          <FormField label="Photo (optional)">
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-fit rounded-admin-sm border border-admin-border-hover px-3 py-1.5 text-[13px] font-semibold text-admin-ink hover:bg-admin-tint-strong"
            >
              {photo ? photo.name : "Choose photo"}
            </button>
          </FormField>
        )}

        {error && <div className="rounded-admin-sm bg-admin-danger-bg px-3.5 py-2.5 text-[13px] font-semibold text-admin-danger">{error}</div>}

        <div className="mt-2 flex justify-end gap-2 border-t border-admin-divider pt-4">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isPending}>
            {isPending ? (isEditing ? "Saving…" : "Creating…") : isEditing ? "Save changes" : "Create venue"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
