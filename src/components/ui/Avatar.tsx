import { cn } from "@/lib/utils/cn";

interface AvatarProps {
  name: string;
  /** Real photo URL (faculty.profile_url / students.photo_url) — shown instead of initials when present. */
  imageUrl?: string | null;
  size?: number;
  className?: string;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** The design reference uses exactly one avatar style everywhere: a solid dark initials circle — no photo avatars in the reference itself, but real profile photos (when Prisma actually has one) take priority over it here. */
export function Avatar({ name, imageUrl, size = 38, className }: AvatarProps) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- external/arbitrary storage URLs, not worth wiring into next.config's image domain allowlist for an avatar thumbnail.
      <img
        src={imageUrl}
        alt={name}
        className={cn("shrink-0 rounded-full object-cover", className)}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className={cn("flex shrink-0 items-center justify-center rounded-full bg-ink font-bold text-white", className)}
      style={{ width: size, height: size, fontSize: size * 0.34 }}
    >
      {getInitials(name)}
    </div>
  );
}
