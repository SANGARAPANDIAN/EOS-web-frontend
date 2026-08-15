import { cn } from "@/lib/utils/cn";

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

/** Pulsing placeholder block — size it via className (e.g. `h-4 w-24 rounded-md`). */
export function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-surface-tint", className)}
      style={style}
    />
  );
}
