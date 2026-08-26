import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface UploadedAttachment {
  file_key: string;
  file_name: string;
  url: string;
}

/**
 * POST /me/media-requests/attachments — storage upload for a media request,
 * returning a real public URL (no expiry).
 *
 * NOT /announcements/attachments. That endpoint's role list is admin,
 * principal, hod, faculty, placement, higher_education, edc_coordinator,
 * secretary, billing, iqac — media_room is absent, so attaching a file to an
 * internal request failed with "Access denied. Required role(s): ...". This
 * endpoint is the purpose-built one for exactly this upload and already grants
 * media_room, and it returns the identical { file_key, file_name, url } shape.
 */
export function useUploadAttachment() {
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return apiClient.postForm<UploadedAttachment>("/me/media-requests/attachments", formData);
    },
  });
}
