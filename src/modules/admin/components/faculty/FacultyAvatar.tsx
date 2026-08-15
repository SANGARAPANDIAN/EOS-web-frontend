import { avatarToneFor, initialsOf } from "@/modules/admin/lib/faculty-format";
import type { Faculty } from "@/modules/admin/api/faculty";
import { cn } from "@/lib/utils/cn";

interface FacultyAvatarProps {
  faculty: Pick<Faculty, "id" | "first_name" | "last_name"> & { profile_url?: string | null };
  className?: string;
}

/** Photo if uploaded, otherwise initials on a deterministic tinted background — used across the table, quick-view drawer, ID card modal, and detail header. */
export function FacultyAvatar({ faculty, className = "size-16 rounded-admin-lg text-xl" }: FacultyAvatarProps) {
  const tone = avatarToneFor(faculty.id);
  return (
    <span
      className={cn("flex shrink-0 items-center justify-center overflow-hidden border border-admin-border font-bold", className)}
      style={faculty.profile_url ? undefined : { background: tone.bg, color: tone.fg }}
    >
      {faculty.profile_url ? (
        // eslint-disable-next-line @next/next/no-img-element -- a remote storage URL, not a local/optimizable asset
        <img src={faculty.profile_url} alt="" className="h-full w-full object-cover" />
      ) : (
        initialsOf(faculty)
      )}
    </span>
  );
}
