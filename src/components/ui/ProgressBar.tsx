import { cn } from "@/lib/utils/cn";

interface ProgressBarProps {
  percent: number;
  height?: number;
  className?: string;
  /** Optional vertical tick marking a threshold (e.g. attendance minimum %). */
  thresholdPercent?: number;
}

export function ProgressBar({ percent, height = 5, className, thresholdPercent }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div
      className={cn("relative overflow-hidden rounded-[4px] bg-surface-tint", className)}
      style={{ height }}
    >
      <div className="h-full rounded-[4px] bg-primary" style={{ width: `${clamped}%` }} />
      {thresholdPercent !== undefined && (
        <div
          className="absolute bg-primary"
          style={{ left: `${thresholdPercent}%`, top: -3, width: 2, height: height + 10 }}
        />
      )}
    </div>
  );
}
