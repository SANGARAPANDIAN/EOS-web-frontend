import { cn } from "@/lib/utils/cn";

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Base pulsing placeholder block — the single primitive every skeleton
 * layout below is built from. Used for whole-page initial loads (shaped
 * roughly like the real content that's about to appear, Google-Classroom
 * style) so the page never flashes an empty box. Smaller in-place work —
 * filtering, refetching, a single table's own loading row — keeps using
 * <Spinner>/<EmptyState loading /> instead; skeletons are for "there is
 * nothing on screen yet," spinners are for "something is already here and
 * is being refreshed."
 */
export function Skeleton({ className, style }: SkeletonProps) {
  return <div className={cn("animate-pulse rounded-[8px] bg-surface-tint", className)} style={style} />;
}

/** A row of N stat-tile-shaped placeholders, matching StatCard/the local uppercase-caption tile pattern used across HoD pages. */
export function SkeletonStatTiles({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid gap-4", className)} style={{ gridTemplateColumns: `repeat(${count}, 1fr)` }}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-card border border-border-default bg-surface p-[18px_18px_16px]">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-3 h-7 w-14" />
        </div>
      ))}
    </div>
  );
}

/** A two-up filter-bar placeholder, matching the "two dropdowns side by side" card at the top of most HoD list/detail pages. */
export function SkeletonFilterBar({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-card border border-border-default bg-surface p-5", className)}>
      <div className="grid grid-cols-2 gap-6">
        <div>
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-2 h-10 w-full" />
        </div>
        <div>
          <Skeleton className="h-3 w-32" />
          <Skeleton className="mt-2 h-10 w-full" />
        </div>
      </div>
    </div>
  );
}

/** N list rows, each an avatar-shaped circle + two lines — matches roster/list pages (attendance, library, announcements, etc). */
export function SkeletonRows({ count = 5, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center gap-3.5 rounded-card border border-border-default bg-surface px-4 py-3.5">
          <Skeleton className="size-9 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="mt-2 h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** A DataTable-shaped placeholder: header bar + N row bars. */
export function SkeletonTable({ rows = 6, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-card border border-border-default bg-surface", className)}>
      <div className="bg-surface-muted px-5 py-3.5">
        <Skeleton className="h-2.5 w-full max-w-[420px]" />
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="border-t border-divider px-5 py-4">
          <Skeleton className="h-3.5 w-full" />
        </div>
      ))}
    </div>
  );
}

/** A grid of N card-shaped placeholders — matches Current Semester's subject cards, Library's list cards, etc. */
export function SkeletonCardGrid({
  count = 3,
  columns = 3,
  className,
}: {
  count?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-4", className)} style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-card border border-border-default bg-surface p-5">
          <div className="flex items-start gap-3">
            <Skeleton className="size-11 shrink-0 rounded-[10px]" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="mt-2 h-3 w-1/2" />
            </div>
          </div>
          <Skeleton className="mt-4 h-1.5 w-full" />
          <Skeleton className="mt-3 h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}

/** A page whose whole body is a single wide card of free-form content (e.g. a form or grid), matching pages like Timetable/Current Semester's outer Card. */
export function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-card border border-border-default bg-surface p-5", className)}>
      <Skeleton className="h-4 w-1/4" />
      <Skeleton className="mt-4 h-40 w-full" />
    </div>
  );
}
