import { cn } from "@/lib/utils/cn";
import { Spinner } from "@/components/ui/Spinner";

interface EmptyStateProps {
  message?: string;
  /** Shows the spinner instead of `message` — the standard "Loading…" replacement everywhere in this module. */
  loading?: boolean;
  /** Spinner pixel size — scale this up when the surrounding container is a large, otherwise-empty area (e.g. a whole page's sole content card) so the icon reads proportionate to the space it's centered in. Defaults to a size suited to compact widgets. */
  size?: number;
  className?: string;
}

export function EmptyState({ message, loading, size = 26, className }: EmptyStateProps) {
  if (loading) {
    return (
      <div className={cn("flex items-center justify-center py-8 text-primary", className)}>
        <Spinner size={size} />
      </div>
    );
  }
  return <div className={cn("py-5 text-[13px] text-subtle", className)}>{message}</div>;
}
