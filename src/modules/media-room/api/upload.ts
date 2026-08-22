import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface UploadedAttachment {
  file_key: string;
  file_name: string;
  url: string;
}

/** POST /announcements/attachments — shared storage upload, real public URL (no expiry). */
export function useUploadAttachment() {
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return apiClient.postForm<UploadedAttachment>("/announcements/attachments", formData);
    },
  });
}
