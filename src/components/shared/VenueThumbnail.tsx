import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils/cn";

interface VenueThumbnailProps {
  photoUrl: string | null;
  /** Used only for the alt text — never shown as a text fallback (an icon reads better than initials for a place, not a person). */
  name: string;
  /** Pixels, both dimensions. Kept to one shared default so a venue photo reads at the same size everywhere it appears (Secretary, HoD, Faculty, Admin) — no per-page 36px/38px one-offs. */
  size?: number;
  className?: string;
}

/**
 * The one place venue photo display is implemented — every page that shows
 * a venue card (Secretary/HoD/Faculty booking pages, Admin's catalog) renders
 * through this instead of hand-rolling its own <img>-or-placeholder markup,
 * so a real photo and the no-photo fallback look identical everywhere.
 */
export function VenueThumbnail({ photoUrl, name, size = 56, className }: VenueThumbnailProps) {
  const style = { width: size, height: size };
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- a Supabase Storage URL, not a local/optimizable asset
      <img
        src={photoUrl}
        alt={name}
        style={style}
        className={cn("shrink-0 rounded-[10px] border border-border-default object-cover", className)}
      />
    );
  }
  return (
    <div
      style={style}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-[10px] border border-border-default bg-surface-tint text-muted",
        className,
      )}
    >
      <Icon name="meeting_room" size={Math.round(size * 0.45)} />
    </div>
  );
}
