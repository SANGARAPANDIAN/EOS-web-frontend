/**
 * Client-side media probing for the publishing screen.
 *
 * Why dimensions are read here rather than on the server: the browser already
 * has the file decoded, so measuring is free, whereas the API would have to
 * pull the object back out of storage and decode it just to learn its size.
 * The numbers are stored on announcement_media so the mobile feed can reserve
 * the right aspect ratio BEFORE the image downloads — that is what stops the
 * feed jumping as each photo loads.
 */

export type MediaKind = "photo" | "video";

export interface ProbedMedia {
  file: File;
  kind: MediaKind;
  /** Object URL for the local preview. Must be revoked by the caller. */
  previewUrl: string;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
}

/** Matches announcement_media_seq_range_check and the DTO's ArrayMaxSize. */
export const MAX_MEDIA_PER_POST = 10;

/** Kept in step with the API's own multipart limit so a doomed upload is refused up front. */
export const MAX_FILE_BYTES = 25 * 1024 * 1024;

export function mediaKindOf(file: File): MediaKind | null {
  if (file.type.startsWith("image/")) return "photo";
  if (file.type.startsWith("video/")) return "video";
  return null;
}

/**
 * Reads a file's intrinsic size (and duration, for video) without uploading it.
 *
 * Resolves with nulls rather than rejecting when the browser cannot decode the
 * file: dimensions are an optimisation, so a codec the browser does not know
 * must not block an otherwise valid upload. The server treats them as optional
 * for exactly this reason.
 */
export function probeMedia(file: File): Promise<ProbedMedia> {
  const kind = mediaKindOf(file);
  const previewUrl = URL.createObjectURL(file);

  const base: ProbedMedia = {
    file,
    kind: kind ?? "photo",
    previewUrl,
    width: null,
    height: null,
    durationSeconds: null,
  };

  if (kind === "photo") {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () =>
        resolve({
          ...base,
          width: img.naturalWidth || null,
          height: img.naturalHeight || null,
        });
      img.onerror = () => resolve(base);
      img.src = previewUrl;
    });
  }

  if (kind === "video") {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () =>
        resolve({
          ...base,
          width: video.videoWidth || null,
          height: video.videoHeight || null,
          durationSeconds: Number.isFinite(video.duration)
            ? Math.max(1, Math.round(video.duration))
            : null,
        });
      video.onerror = () => resolve(base);
      video.src = previewUrl;
    });
  }

  return Promise.resolve(base);
}

/**
 * Validates a batch before anything is uploaded, so the user gets one clear
 * message instead of a partial upload followed by a rejected post.
 */
export function validateMediaBatch(
  existingCount: number,
  incoming: File[],
): string | null {
  if (existingCount + incoming.length > MAX_MEDIA_PER_POST) {
    return `A post can carry at most ${MAX_MEDIA_PER_POST} items. You already have ${existingCount}.`;
  }
  for (const file of incoming) {
    if (!mediaKindOf(file)) {
      return `${file.name} is not an image or a video.`;
    }
    if (file.size > MAX_FILE_BYTES) {
      return `${file.name} is larger than ${Math.round(MAX_FILE_BYTES / (1024 * 1024))} MB.`;
    }
  }
  return null;
}
