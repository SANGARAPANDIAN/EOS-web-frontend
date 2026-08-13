import { cn } from "@/lib/utils/cn";

interface ProfilePhotoProps {
  /** Real photo URL — shown instead of the placeholder box when present. */
  imageUrl?: string | null;
  alt: string;
  /** Placeholder label, e.g. "student photo" / "faculty photo" / "father photo". */
  label: string;
  /** Optional second placeholder line, e.g. "35 x 45 mm". */
  caption?: string;
  className?: string;
}

/**
 * A passport-photo-shaped box: a real <img> when Prisma actually has a URL
 * (students.photo_url / faculty.profile_url), otherwise the exact bordered
 * placeholder the design reference itself shows for a not-yet-uploaded
 * photo — never a fabricated image.
 */
export function ProfilePhoto({ imageUrl, alt, label, caption, className }: ProfilePhotoProps) {
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
