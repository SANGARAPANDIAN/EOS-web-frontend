"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils/cn";

interface ProfilePhotoProps {
  /** HoD-style passport-photo-box mode: real photo URL, shown instead of the placeholder box when present. */
  imageUrl?: string | null;
  alt?: string;
  /** HoD-style passport-photo-box mode: placeholder label, e.g. "student photo" / "faculty photo" / "father photo". Presence of this prop selects the passport-photo-box rendering below over the circular-avatar rendering. */
  label?: string;
  /** HoD-style passport-photo-box mode: optional second placeholder line, e.g. "35 x 45 mm". */
  caption?: string;
  /** Circular-avatar mode: real photo URL — falls back to initials when absent/failed. */
  photoUrl?: string | null;
  /** Circular-avatar mode: person's name, used for the initials fallback and alt text. */
  name?: string;
  /** Circular-avatar mode: diameter in px. */
  size?: number;
  className?: string;
}

/**
 * Two rendering modes sharing this component, dispatched on whether `label`
 * is passed (HoD's detail pages always pass it; every other caller never
 * does):
 *
 * - Passport-photo-box (`label` present): a real <img> when Prisma actually
 *   has a URL (students.photo_url / faculty.profile_url), otherwise the
 *   exact bordered placeholder the design reference itself shows for a
 *   not-yet-uploaded photo — never a fabricated image.
 * - Circular avatar (`label` absent): real profile photo when one's on
 *   file — falls back to `Avatar`'s initials circle when there isn't one,
 *   or if the URL fails to load. Kept as its own component rather than
 *   teaching `Avatar` to do both: `Avatar` deliberately stays initials-only
 *   everywhere else in the app (sidebar, notification rows, etc., where the
 *   design reference has exactly one avatar style) — this is only for
 *   detail pages that specifically want a real photo when available (plain
 *   `<img>`, not `next/image`, since the photo's storage domain isn't in
 *   next.config's remote-image allowlist).
 */
export function ProfilePhoto({ imageUrl, alt, label, caption, photoUrl, name, size = 38, className }: ProfilePhotoProps) {
  const [failed, setFailed] = useState(false);

  if (label !== undefined) {
    if (imageUrl) {
      // eslint-disable-next-line @next/next/no-img-element -- external/arbitrary storage URLs, not worth wiring into next.config's image domain allowlist.
      return <img src={imageUrl} alt={alt} className={cn("rounded-[10px] border border-border-default object-cover", className)} />;
    }
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-0.5 rounded-[10px] border border-border-default bg-surface-tint text-center text-[12px] text-subtle",
          className,
        )}
      >
        <span>{label}</span>
        {caption && <span>{caption}</span>}
      </div>
    );
  }

  if (!photoUrl || failed) {
    return <Avatar name={name ?? ""} size={size} className={className} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- external, arbitrary storage domain; next/image would need it in the remote-patterns allowlist
    <img
      src={photoUrl}
      alt={name}
      onError={() => setFailed(true)}
      className={cn("shrink-0 rounded-full bg-surface-tint object-cover", className)}
      style={{ width: size, height: size }}
    />
  );
}
