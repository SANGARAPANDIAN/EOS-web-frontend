"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils/cn";

interface ProfilePhotoProps {
  photoUrl?: string | null;
  name: string;
  size?: number;
  className?: string;
}

/**
 * Real profile photo when one's on file — falls back to `Avatar`'s initials
 * circle when there isn't one, or if the URL fails to load. Kept as its own
 * component rather than teaching `Avatar` to do both: `Avatar` deliberately
 * stays initials-only everywhere else in the app (sidebar, notification
 * rows, etc., where the design reference has exactly one avatar style) —
 * this is only for detail pages that specifically want a real photo when
 * available (plain `<img>`, not `next/image`, since the photo's storage
 * domain isn't in next.config's remote-image allowlist).
 */
export function ProfilePhoto({ photoUrl, name, size = 38, className }: ProfilePhotoProps) {
  const [failed, setFailed] = useState(false);

  if (!photoUrl || failed) {
    return <Avatar name={name} size={size} className={className} />;
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
