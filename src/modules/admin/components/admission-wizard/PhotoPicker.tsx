"use client";

import { useRef } from "react";
import { Icon } from "@/components/ui/Icon";
import { Button, useToast } from "@/modules/admin/components/ui";
import { friendlyError } from "@/lib/utils/errors";
import { useUploadApplicationPhoto } from "@/modules/admin/api/admissions";

/**
 * Not part of the reference's 14 categories — the reference never handled
 * admission photos at all. Rendered as an extra widget above the "Identity &
 * login" category's own field grid rather than a FieldSpec, since a file
 * picker doesn't fit the text/select/date field model the rest of the
 * wizard is built on. Uploads immediately (there's no students row to
 * attach photo_url to yet); the returned URL rides in the wizard's own
 * values/draft state exactly like every other field, and goes out in the
 * final perfect-entry payload.
 */
export function PhotoPicker({
  applicationId,
  photoUrl,
  onUploaded,
}: {
  applicationId: number;
  photoUrl: string | undefined;
  onUploaded: (url: string) => void;
}) {
  const { show } = useToast();
  const uploadPhoto = useUploadApplicationPhoto();
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // lets the same file be re-picked after a failed upload
    if (!file) return;
    try {
      const { url } = await uploadPhoto.mutateAsync({ id: applicationId, file });
      onUploaded(url);
      show("Photo uploaded.", "success");
    } catch (err) {
      show(friendlyError(err), "error");
    }
  }

  return (
    <div className="mb-6 flex items-center gap-4 rounded-admin-md border border-admin-border bg-admin-tint p-4">
      <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-admin-pill border border-admin-border bg-admin-canvas">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- a Supabase Storage URL, not a local/optimizable asset
          <img src={photoUrl} alt="Candidate" className="h-full w-full object-cover" />
        ) : (
          <Icon name="person" size={28} className="text-admin-border-hover" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-admin-body">Photograph</p>
        <p className="text-xs text-admin-subtle">Optional — JPG, PNG or WebP, up to 5MB.</p>
      </div>
      <input ref={inputRef} type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={handleFile} />
      <Button variant="secondary" size="sm" disabled={uploadPhoto.isPending} onClick={() => inputRef.current?.click()}>
        <Icon name="upload" size={15} /> {uploadPhoto.isPending ? "Uploading…" : photoUrl ? "Replace" : "Upload"}
      </Button>
    </div>
  );
}
