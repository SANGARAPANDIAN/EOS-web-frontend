import { cn } from "@/lib/utils/cn";

interface AvatarProps {
  name: string;
  size?: number;
  className?: string;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** The design reference uses exactly one avatar style everywhere: a solid dark initials circle — no photo avatars. */
export function Avatar({ name, size = 38, className }: AvatarProps) {
  return (
    <div
      className={cn("flex shrink-0 items-center justify-center rounded-full bg-ink font-bold text-white", className)}
      style={{ width: size, height: size, fontSize: size * 0.34 }}
    >
      {getInitials(name)}
    </div>
  );
}
